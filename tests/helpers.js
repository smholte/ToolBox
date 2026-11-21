'use strict';
// Starting the app for the tests: from this checkout with Electron (Linux, under a virtual screen), or the installed
// app when TOOLBOX_EXE names its .exe (the Windows run on GitHub).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toolbox-' + name + '-'));
}

function command() {
  if (process.env.TOOLBOX_EXE) return { exe: process.env.TOOLBOX_EXE, args: [] };
  const args = [ROOT];
  if (process.platform === 'linux') args.push('--no-sandbox', '--disable-gpu');
  return { exe: require('electron'), args };
}

/** Environment for a run: its own settings folder (unless installed: the real one), a status file. */
function env(opts = {}) {
  const e = Object.assign({}, process.env);
  delete e.NODE_OPTIONS;            // Electron refuses some Node options of the test runner
  delete e.ELECTRON_RUN_AS_NODE;
  if (opts.data) e.FRESING_TOOLBOX_DATA = opts.data;
  if (opts.status) e.FRESING_TOOLBOX_STATUS = opts.status;
  if (opts.langDir) e.FRESING_TOOLBOX_LANG_DIR = opts.langDir;
  // Never the real Toolbox folder of the machine the tests run on: one of the test's own, or a new empty one.
  e.FRESING_TOOLBOX_FOLDER = opts.folder || path.join(tempDir('folder'), 'Toolbox');
  delete e.TOOLBOX_HOME;
  return e;
}

async function launch(opts = {}) {
  const { _electron } = require('playwright');
  const c = command();
  const app = await _electron.launch({
    executablePath: c.exe,
    args: c.args.concat(opts.args || []),
    env: env(opts),
    timeout: 60000,
  });
  await waitFor(() => app.evaluate(() => !!(globalThis.toolbox && globalThis.toolbox.state.tray)), 'the tray');
  return app;
}

/** Start a plain second process (not through Playwright) and wait for it to end. */
function runPlain(opts = {}, timeoutMs = 30000) {
  const c = command();
  return new Promise((resolve, reject) => {
    const child = spawn(c.exe, c.args.concat(opts.args || []), { env: env(opts), stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('the second start did not end within ' + timeoutMs / 1000 + ' s'));
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

async function waitFor(fn, what, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('waited ' + timeoutMs / 1000 + ' s for ' + what + (last instanceof Error ? ': ' + last.message : ''));
}

/** Click a tray-menu item by id, as the user would. */
function clickMenu(app, id) {
  return app.evaluate((electron, itemId) => {
    const item = globalThis.toolbox.state.menu.getMenuItemById(itemId);
    if (!item) throw new Error('no menu item ' + itemId);
    item.click();
  }, id);
}

function menuItems(app) {
  return app.evaluate(() => {
    const walk = (items) => items.map((i) => ({
      id: i.id, type: i.type, label: i.label, checked: i.checked,
      submenu: i.submenu ? walk(i.submenu.items) : undefined,
    }));
    return walk(globalThis.toolbox.state.menu.items);
  });
}

async function dropWindow(app) {
  return waitFor(async () => {
    for (const page of app.windows()) {
      if ((await page.url()).endsWith('drop.html')) return page;
    }
    return null;
  }, 'the drop window');
}

// ---------------------------------------------------------------- the format's samples and checker (task 0005)
const SAMPLES = path.join(ROOT, 'tests', 'data', 'samples');
const CHECKER = path.join(ROOT, 'tests', 'format-checker', 'check.py');
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

/** a copy of the format's sample Toolbox folder (or of only its manifests), in a new temporary folder */
function sampleFolder(manifestsOnly = false) {
  const to = path.join(tempDir('samples'), 'Toolbox');
  fs.cpSync(path.join(SAMPLES, 'Toolbox'), to, {
    recursive: true,
    filter: (src) => !manifestsOnly || !/[\\/]inbox[\\/]|alive\.json$/.test(src),
  });
  return to;
}

/** the format's own checker (Python) on a folder, a job or a manifest: { ok, out } – ok when it found no ERROR */
function check(...paths) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(PYTHON, [CHECKER, ...paths], { encoding: 'utf8' });
  if (r.error) throw new Error(`the format's checker needs Python with jsonschema (${PYTHON}): ${r.error.message}`);
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

module.exports = { ROOT, tempDir, launch, runPlain, waitFor, clickMenu, menuItems, dropWindow, SAMPLES, CHECKER, PYTHON, sampleFolder, check };
