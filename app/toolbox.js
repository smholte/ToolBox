'use strict';
// The router's side of the Toolbox folder (task 0005): it finds or makes the folder, is a tool in it itself
// (nl.fresing.toolbox), says it is running (alive.json), knows the other tools, and tells what a dropped file is.
// Everything about the format is done by the format's own code (app/vendor/toolbox-format/toolbox-folder.js, copied
// unchanged), working on the real folder through the adapter in folder.js.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const vm = require('vm');
const adapter = require('./folder');

const ME = 'nl.fresing.toolbox';
const ALIVE_EVERY_MS = 10 * 1000;      // FORMAT.md 6.4: at least every 10 seconds
const VENDOR = path.join(__dirname, 'vendor', 'toolbox-format', 'toolbox-folder.js');

/** The format's code, run as it is: it hangs ToolboxFolder on the object it is given as `window`. That object has
    no `navigator`, so its "one window at a time" simply runs (the app runs as one instance only). */
function loadFormat() {
  const holder = {};
  const src = fs.readFileSync(VENDOR, 'utf8');
  vm.runInThisContext('(function (window) {' + src + '\n})', { filename: VENDOR })(holder);
  return holder.ToolboxFolder;
}
const TF = loadFormat();

/** Where the Toolbox folder is: FRESING_TOOLBOX_FOLDER (for the tests only), else TOOLBOX_HOME (the format's own
    setting, FORMAT.md 2), else "Toolbox" in the user's home folder. */
function folderPath(env = process.env) {
  if (env.FRESING_TOOLBOX_FOLDER) return path.resolve(env.FRESING_TOOLBOX_FOLDER);
  if (env.TOOLBOX_HOME) return path.resolve(env.TOOLBOX_HOME);
  return path.join(os.homedir(), 'Toolbox');           // not shown: the folder's name (FORMAT.md 2)
}

/** The router's manifest: app/toolbox-manifest.json, with what only the running app knows. Its one action takes back
    the results of jobs it sends (0007), of every built-in type: 0.2 has no "any type", and a tool's own types are
    not known in advance. */
function manifest({ appVersion, program, args }) {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'toolbox-manifest.json'), 'utf8'));
  m.version = TF.VERSION;
  m.app_version = appVersion;
  m.start = { program };
  if (args && args.length) m.start.args = args;
  for (const a of m.actions) if (a.id === 'take-result') a.accepts = TF.TYPES.map((t) => t.id);
  return m;
}

// Errors of a write that another program refused (try again at the next tick), and of a folder that went away.
const REFUSALS = ['NoModificationAllowedError', 'InvalidModificationError', 'UnknownError', 'NotReadableError']; // not shown
const isRefusal = (err) => !!err && REFUSALS.includes(err.name);
const isGone = (err) => !!err && err.name === 'NotFoundError'; // not shown

async function writeFile(dir, name, data) {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
  try {
    await w.write(data);
    await w.close();
  } catch (err) {
    await w.abort().catch(() => {});
    throw err;
  }
}

class RouterFolder {
  /** opts: { path, appVersion, program, args, icon (a PNG file to show as the router's icon) } */
  constructor(opts) {
    this.opts = opts;
    this.path = opts.path || folderPath();
    this.box = null;
    this.state = 'unknown';      // ok · other-version · not-toolbox · not-a-folder · error
    this.version = null;         // the version of a folder of another version
    this.pending = new Set();    // what could not be written yet: 'manifest', 'icon'
    this.lastError = null;       // for the log and the tests only
    this.timer = null;
    this._connecting = null;
  }

  summary() {
    return { path: this.path, state: this.state, version: this.version, pending: [...this.pending] };
  }

  /** Find the folder, make or mark it when it is missing or empty, and write the router's own files. Never throws:
      what goes wrong is in this.state. */
  connect() {
    if (!this._connecting) this._connecting = this._connect().finally(() => { this._connecting = null; });
    return this._connecting;
  }

  async _connect() {
    this.box = null;
    this.version = null;
    try {
      this.state = await this._open();
    } catch (err) {
      this.state = 'error';
      this.lastError = String(err && err.message);
    }
    if (this.state === 'ok') {
      this.pending = new Set(['manifest', 'icon']);
      for (const p of [this.path, path.join(this.path, 'tools', ME)]) await adapter.removeTemps(p);
      try {
        await this._writeOwn();
        await this.alive();
      } catch (err) {
        this.lastError = String(err && err.message);
      }
    }
    return this.summary();
  }

  async _open() {
    try {
      await fsp.mkdir(this.path);                      // only the last part: the user's home folder is there
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    const st = await fsp.stat(this.path);              // the Toolbox folder itself may be a link (moved elsewhere)
    if (!st.isDirectory()) return 'not-a-folder';
    const root = adapter.directory(this.path);
    try {
      this.box = await TF.open(root, ME);
      // tools/ that is a link (or a file) is not followed: the format's code then has no tools folder
      return this.box.tools ? 'ok' : (this.box = null, 'not-toolbox');
    } catch (err) {
      if (!(err instanceof TF.TbError)) throw err;
      if (err.code === 'version') {
        this.version = await this._markerVersion();
        return 'other-version';
      }
      if (err.code !== 'not-toolbox' || !await this._empty(root)) return 'not-toolbox';
    }
    // A native tool makes the folder (FORMAT.md 2): here an empty folder, or one with only an empty tools/.
    await writeFile(root, 'toolbox-folder.json', TF.toJson({ format: 'toolbox-folder', version: TF.VERSION }));
    this.box = await TF.open(root, ME);
    return this.box.tools ? 'ok' : (this.box = null, 'not-toolbox');
  }

  async _markerVersion() {
    try {
      const doc = JSON.parse(await fsp.readFile(path.join(this.path, 'toolbox-folder.json'), 'utf8'));
      return typeof doc.version === 'string' ? doc.version.slice(0, 20) : null;
    } catch {
      return null;
    }
  }

  async _empty(root) {
    for await (const [name, h] of root.entries()) {
      if (name.endsWith('.crswap')) continue;
      if (name.toLowerCase() === 'tools' && h.kind === 'directory') {
        for await (const inner of h.entries()) if (inner) return false;
        continue;
      }
      return false;
    }
    return true;
  }

  /** the manifest and the icon; what is refused now (another program reads it) is written at the next tick */
  async _writeOwn() {
    if (!this.box) return;
    if (this.pending.has('manifest')) {
      try {
        await this.box.writeManifest(manifest(this.opts));
        this.pending.delete('manifest');
      } catch (err) {
        this._failed(err);
      }
    }
    if (this.pending.has('icon') && !this.pending.has('manifest')) {
      try {
        const me = await (await this.box.root.getDirectoryHandle('tools')).getDirectoryHandle(ME);
        await writeFile(me, 'icon.png', fs.readFileSync(this.opts.icon));
        this.pending.delete('icon');
      } catch (err) {
        this._failed(err);
      }
    }
  }

  _failed(err) {
    this.lastError = String(err && err.message);
    // The folder, tools/ or the router's own folder was deleted (the format's code then meets a missing handle):
    // made again at the next tick.
    if (isGone(err) || err instanceof TypeError) this.state = 'gone';
    else if (!isRefusal(err)) throw err;
  }

  /** alive.json (FORMAT.md 6.4); a refused write is simply written at the next tick */
  async alive() {
    if (!this.box) return;
    try {
      await this.box.alive(this.opts.appVersion);
    } catch (err) {
      this._failed(err);
    }
  }

  /** every 10 seconds: alive.json, what is still to write, and a folder that was not usable or went away */
  async tick() {
    try {
      // not usable before, or deleted meanwhile (the format's code then fails without a clear error): look again
      const own = path.join(this.path, 'tools', ME, 'toolbox.json');
      if (this.state !== 'ok' || !fs.existsSync(path.join(this.path, 'toolbox-folder.json')) || !fs.existsSync(own)) {
        return await this.connect();
      }
      await this._writeOwn();
      await this.alive();
    } catch (err) {
      this.lastError = String(err && err.message);
    }
    return this.summary();
  }

  start() {
    this.stop();
    this.timer = setInterval(() => { this.tick(); }, ALIVE_EVERY_MS);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** At quit: the router runs as one copy only, so it may say it is gone (6.4). */
  async close() {
    this.stop();
    if (!this.box) return;
    try {
      await this.box.notAlive();
    } catch {
      // still there: it is old after 30 seconds anyway
    }
  }

  /** The other tools of the folder, read fresh: [{ id, name, open, actions }] */
  async tools() {
    if (!this.box) return [];
    const all = await this.box.all();
    return all.filter((t) => t.manifest.id !== ME).map((t) => ({
      id: t.manifest.id, name: t.manifest.name, open: t.open, actions: t.manifest.actions,
    }));
  }

  /** What a file on disk is, for the drop window: its type by content (FORMAT.md 5.3) and the tools that take it.
      The tools are read again at every look, so a tool added a moment ago is there. */
  async look(filePath) {
    if (this.state !== 'ok') await this.connect();
    const name = path.basename(filePath);
    const out = { name, kind: 'file', size: 0, type: null, typeName: null, note: null, tools: [], folder: this.summary() };
    let real;
    try {
      real = await fsp.realpath(filePath);
      const st = await fsp.stat(real);
      if (st.isDirectory()) return Object.assign(out, { kind: 'folder' });
      if (!st.isFile()) return Object.assign(out, { kind: 'unreadable' });
    } catch (err) {
      return Object.assign(out, { kind: err && err.code === 'ENOENT' ? 'missing' : 'unreadable' });
    }
    let types = TF.TYPES;
    let tools = [];
    try {
      if (this.box) {
        types = await this.box.types();
        tools = await this.tools();
      }
    } catch (err) {
      this.lastError = String(err && err.message);
    }
    let found;
    try {
      const file = await adapter.fileAt(real).getFile();
      out.size = file.size;
      found = await TF.detectType(file, types, name);
    } catch (err) {
      return Object.assign(out, { kind: 'unreadable' });
    }
    const ext = path.extname(name).toLowerCase();
    const known = types.find((t) => t.id === found.type);
    out.type = found.type;
    out.typeName = known ? known.name : null;
    out.ext = ext;
    if (found.note && known) out.note = { kind: 'content', typeName: known.name };
    else if (found.note) {
      const other = types.find((t) => t.extensions.includes(ext));
      out.note = { kind: 'name', typeName: other ? other.name : '' };
    }
    out.tools = tools.filter((t) => t.actions.some((a) => a.accepts.includes(found.type))).map((t) => ({ id: t.id, name: t.name, open: t.open }));
    return out;
  }
}

module.exports = { TF, ME, folderPath, manifest, RouterFolder, loadFormat };
