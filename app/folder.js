'use strict';
// The adapter (task 0005): folder and file handles over Node's `fs` that behave like the browser's (File System
// Access API), so the format's own code – app/vendor/toolbox-format/toolbox-folder.js, copied unchanged – works on
// the real Toolbox folder. Only what that code uses is here:
//
//   directory handle: kind, name, getDirectoryHandle(name, {create}), getFileHandle(name, {create}), entries(),
//                     removeEntry(name, {recursive})
//   file handle:      kind, name, getFile(), createWritable()
//   file (getFile()): name, size, lastModified, type, slice(), arrayBuffer(), stream(), text()
//   writable:         write(data), close(), abort()
//
// Errors are DOMExceptions with the browser's names (NotFoundError, TypeMismatchError, NoModificationAllowedError …),
// because the format's code decides by them. Where the adapter differs from a browser, on purpose:
// - A link (a symbolic link, or a junction on Windows) is never followed: it is listed with kind 'link', which the
//   format's code skips, opening it gives TypeMismatchError ("not a plain file"), and it is never deleted through.
// - getFileHandle(name, {create: true}) makes no empty file: the file appears whole when its writable is closed.
//   (A browser makes the empty file at once; a reader could then meet an empty job.json.)
// - createWritable() writes beside the file and moves it over the old one on close(): whole or not at all. Windows
//   refuses the move while another program holds the old file open; close() tries a few times for a moment, then
//   gives NoModificationAllowedError and leaves the old file as it was – the format's code tries again later.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/** How long close() keeps trying when Windows refuses to replace a file another program holds (ms). Short: the
    format's code has its own patience for statuses, and the app tries again at its next look. */
const REPLACE_TRIES = { count: 5, pauseMs: 20 };

const REFUSED = new Set(['EPERM', 'EACCES', 'EBUSY']);

function domError(name, message) {
  return new DOMException(message, name);
}

/** a Node error as the browser would name it; `writing` for errors of a write, move or delete */
function asDom(err, writing) {
  if (err instanceof DOMException || err instanceof TypeError) return err;
  const code = err && err.code;
  const msg = (err && err.message) || String(err);
  if (code === 'ENOENT' || code === 'ENOTDIR') return domError('NotFoundError', msg);
  if (code === 'EISDIR') return domError('TypeMismatchError', msg);
  if (code === 'ENOTEMPTY') return domError('InvalidModificationError', msg);
  if (code === 'ENOSPC' || code === 'EDQUOT') return domError('QuotaExceededError', msg);
  if (code === 'EINVAL' || code === 'ENAMETOOLONG') return new TypeError(msg);
  if (REFUSED.has(code)) return domError(writing ? 'NoModificationAllowedError' : 'NotReadableError', msg);
  return domError(writing ? 'UnknownError' : 'NotReadableError', msg);
}

/** a name the browser takes for one entry of a folder; TypeError otherwise */
function checkName(name) {
  if (typeof name !== 'string' || name === '' || name === '.' || name === '..' || /[/\\\0]/.test(name)) {
    throw new TypeError(`'${name}' is not a name for an entry of a folder`);
  }
}

/** 'file', 'directory', 'link' or 'other' – of the entry itself, never of what a link points to; null when missing */
async function kindOf(p) {
  let st;
  try {
    st = await fsp.lstat(p);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw asDom(err, false);
  }
  if (st.isSymbolicLink()) return 'link';            // on Windows also a junction (Node reads its reparse tag)
  if (st.isDirectory()) return 'directory';
  if (st.isFile()) return 'file';
  return 'other';
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** The bytes of a file on disk, read when asked (Node's file-backed Blob, which keeps no file open). Like a
    browser's File it fails with NotReadableError when the file changes or goes after it was opened. */
class NodeFile {
  constructor(blob, name, lastModified) {
    this._blob = blob;
    this.name = name;
    this.lastModified = lastModified;
    this.type = '';
  }
  get size() { return this._blob.size; }
  slice(start, end, type) { return this._blob.slice(start, end, type); }
  arrayBuffer() { return this._blob.arrayBuffer(); }
  stream() { return this._blob.stream(); }
  text() { return this._blob.text(); }
}

class Writable {
  constructor(target, temp, handle) {
    this._target = target;
    this._temp = temp;
    this._fh = handle;
    this._done = false;
  }

  _open() {
    if (this._done) throw new TypeError('the writable is closed');
  }

  async write(data) {
    this._open();
    if (data && typeof data === 'object' && data.type === 'write' && 'data' in data) data = data.data;
    try {
      if (typeof data === 'string') await this._fh.write(data, null, 'utf8');
      else if (data instanceof ArrayBuffer) await this._fh.write(new Uint8Array(data));
      else if (ArrayBuffer.isView(data)) await this._fh.write(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      else if (data && typeof data.stream === 'function') {
        for await (const chunk of data.stream()) await this._fh.write(chunk);
      } else throw new TypeError('write() takes text, bytes or a Blob');
    } catch (err) {
      throw asDom(err, true);
    }
  }

  /** the new content replaces the file whole; on a refusal the old file stays and the new one is dropped */
  async close() {
    this._open();
    this._done = true;
    try {
      await this._fh.sync();
      await this._fh.close();
    } catch (err) {
      await this._fh.close().catch(() => {});
      await fsp.unlink(this._temp).catch(() => {});
      throw asDom(err, true);
    }
    for (let i = 0; ; i += 1) {
      try {
        const kind = await kindOf(this._target);
        if (kind !== null && kind !== 'file') throw domError('TypeMismatchError', `${this._target} is not a plain file`);
        await fsp.rename(this._temp, this._target);
        return;
      } catch (err) {
        if (!REFUSED.has(err && err.code) || i + 1 >= REPLACE_TRIES.count) {
          await fsp.unlink(this._temp).catch(() => {});
          throw asDom(err, true);
        }
      }
      await sleep(REPLACE_TRIES.pauseMs);
    }
  }

  async abort() {
    if (this._done) return;
    this._done = true;
    await this._fh.close().catch(() => {});
    await fsp.unlink(this._temp).catch(() => {});
  }
}

class FileHandle {
  constructor(p) {
    this.kind = 'file';
    this.name = path.basename(p);
    this._path = p;
  }

  async getFile() {
    const kind = await kindOf(this._path);
    if (kind === null) throw domError('NotFoundError', `${this._path} is not there`);
    if (kind !== 'file') throw domError('TypeMismatchError', `${this._path} is not a plain file`);
    let st;
    let blob;
    try {
      st = await fsp.stat(this._path);
      blob = await fs.openAsBlob(this._path);
    } catch (err) {
      throw asDom(err, false);
    }
    return new NodeFile(blob, this.name, Math.floor(st.mtimeMs));
  }

  async createWritable(options = {}) {
    if (options && options.keepExistingData) throw new TypeError('keepExistingData is not supported here');
    // Beside the file, a name no file of the format can have (3.3: no name starts with a dot); short, so a long
    // name plus it never passes the system's limit.
    const temp = path.join(path.dirname(this._path), '.tb-' + crypto.randomBytes(6).toString('hex') + '.tmp');
    let fh;
    try {
      fh = await fsp.open(temp, 'wx');
    } catch (err) {
      throw asDom(err, true);
    }
    return new Writable(this._path, temp, fh);
  }
}

/** delete a folder and what is in it; a link inside is removed itself, never followed */
async function removeTree(p) {
  for (const name of await fsp.readdir(p)) {
    const q = path.join(p, name);
    const kind = await kindOf(q);
    if (kind === 'directory') await removeTree(q);
    else if (kind === 'link') {
      try {
        await fsp.unlink(q);
      } catch (err) {
        if (err.code !== 'EPERM' && err.code !== 'EISDIR') throw err;
        await fsp.rmdir(q);                                   // a junction or a link to a folder on Windows
      }
    } else if (kind !== null) await fsp.unlink(q);
  }
  await fsp.rmdir(p);
}

class DirectoryHandle {
  constructor(p) {
    this.kind = 'directory';
    this.name = path.basename(p);
    this._path = p;
  }

  async getDirectoryHandle(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    let kind = await kindOf(p);
    if (kind === null && options.create) {
      try {
        await fsp.mkdir(p);
      } catch (err) {
        if (err.code !== 'EEXIST') throw asDom(err, true);
      }
      kind = await kindOf(p);
    }
    if (kind === null) throw domError('NotFoundError', `${p} is not there`);
    if (kind !== 'directory') throw domError('TypeMismatchError', `${p} is not a plain folder`);
    return new DirectoryHandle(p);
  }

  async getFileHandle(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    const kind = await kindOf(p);
    if (kind === null) {
      if (!options.create) throw domError('NotFoundError', `${p} is not there`);
      try {
        await fsp.access(this._path);                         // the folder itself must still be there
      } catch (err) {
        throw asDom(err, false);
      }
      return new FileHandle(p);
    }
    if (kind !== 'file') throw domError('TypeMismatchError', `${p} is not a plain file`);
    return new FileHandle(p);
  }

  async* entries() {
    let names;
    try {
      names = await fsp.readdir(this._path);
    } catch (err) {
      throw asDom(err, false);
    }
    for (const name of names) {
      const p = path.join(this._path, name);
      let kind;
      try {
        kind = await kindOf(p);
      } catch {
        continue;                                             // cannot be looked at right now: as if not there
      }
      if (kind === 'directory') yield [name, new DirectoryHandle(p)];
      else if (kind === 'file') yield [name, new FileHandle(p)];
      else if (kind !== null) yield [name, { kind, name }];   // a link or a device: the format's code skips it
    }
  }

  async removeEntry(name, options = {}) {
    checkName(name);
    const p = path.join(this._path, name);
    const kind = await kindOf(p);
    if (kind === null) throw domError('NotFoundError', `${p} is not there`);
    if (kind === 'link' || kind === 'other') {
      throw domError('InvalidModificationError', `${p} is a link: it is never deleted through`);
    }
    try {
      if (kind === 'file') await fsp.unlink(p);
      else if (options.recursive) await removeTree(p);
      else await fsp.rmdir(p);
    } catch (err) {
      throw asDom(err, true);
    }
  }
}

/** a handle for a folder on disk (it need not exist yet) */
function directory(p) {
  return new DirectoryHandle(path.resolve(p));
}

/** a handle for a file on disk, e.g. one dropped on the app */
function fileAt(p) {
  return new FileHandle(path.resolve(p));
}

module.exports = { directory, fileAt, kindOf, REPLACE_TRIES };
