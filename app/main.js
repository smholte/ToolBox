'use strict';
// Fresing ToolBox – the router: a tray icon with its menu, one instance only (task 0004), the Toolbox folder and a
// small drop window that shows a dropped file's type and the tools that take it (task 0005). Handing files to tools
// comes in tasks 0006–0007.

const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const i18n = require('./i18n');
const settingsStore = require('./settings');
const autostart = require('./autostart');
const { RouterFolder, folderPath, TF } = require('./toolbox');

const ICONS = path.join(__dirname, 'icons');

// For the tests only: a separate settings folder, and a file the app keeps its state in.
if (process.env.FRESING_TOOLBOX_DATA) app.setPath('userData', process.env.FRESING_TOOLBOX_DATA);
const STATUS_FILE = process.env.FRESING_TOOLBOX_STATUS || '';

const state = {
  tray: null,
  menu: null,
  dropWindow: null,
  settings: null,
  t: null,
  quitting: false,
  secondInstances: 0,
  lastDrop: null,
  lastLook: null,
  folder: null,
};

function writeStatus() {
  if (!STATUS_FILE) return;
  try {
    writeStatusFile();
  } catch {
    // the status file is for the tests; the app goes on without it
  }
}

function writeStatusFile() {
  const status = {
    pid: process.pid,
    version: app.getVersion(),
    tray: !!state.tray && !state.tray.isDestroyed(),
    language: state.t ? state.t.code : null,
    startWithWindows: state.settings ? state.settings.startWithWindows : null,
    autostartRegistered: autostart.registered(app),
    dropWindowVisible: !!state.dropWindow && !state.dropWindow.isDestroyed() && state.dropWindow.isVisible(),
    secondInstances: state.secondInstances,
    lastDrop: state.lastDrop,
    lastLook: state.lastLook,
    folder: state.folder ? state.folder.summary() : null,
  };
  fs.writeFileSync(STATUS_FILE + '.tmp', JSON.stringify(status, null, 2));
  // Windows refuses the rename while a reader has the file open: try a few times.
  for (let i = 0; i < 20; i += 1) {
    try {
      fs.renameSync(STATUS_FILE + '.tmp', STATUS_FILE);
      return;
    } catch {
      const until = Date.now() + 25;
      while (Date.now() < until) { /* wait a moment */ }
    }
  }
}

function trayImage() {
  if (process.platform === 'win32') return nativeImage.createFromPath(path.join(ICONS, 'tray.ico'));
  const img = nativeImage.createFromPath(path.join(ICONS, 'tray_16px.png'));
  img.addRepresentation({ scaleFactor: 2, buffer: fs.readFileSync(path.join(ICONS, 'tray_32px.png')) });
  return img;
}

function buildMenu() {
  const t = state.t;
  const languages = i18n.listLanguages().map((lang) => ({
    id: 'language-' + lang.code,
    label: lang.name,
    type: 'radio',
    checked: lang.code === t.code,
    click: () => setLanguage(lang.code),
  }));
  return Menu.buildFromTemplate([
    { id: 'open', label: t('menu.open'), click: () => showDropWindow() },
    { type: 'separator' },
    {
      id: 'autostart',
      label: t('menu.autostart'),
      type: 'checkbox',
      checked: state.settings.startWithWindows,
      click: (item) => setStartWithWindows(item.checked),
    },
    { id: 'language', label: t('menu.language'), submenu: languages },
    { id: 'about', label: t('menu.about'), click: () => showAbout() },
    { type: 'separator' },
    { id: 'quit', label: t('menu.quit'), click: () => quit() },
  ]);
}

function refreshMenu() {
  state.menu = buildMenu();
  if (state.tray && !state.tray.isDestroyed()) {
    state.tray.setContextMenu(state.menu);
    state.tray.setToolTip(state.t('tray.tooltip'));
  }
}

function createTray() {
  state.tray = new Tray(trayImage());
  state.tray.on('click', () => showDropWindow());
  refreshMenu();
}

function createDropWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 340,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    title: state.t('drop.title'),
    icon: path.join(ICONS, 'app_256px.png'),
    backgroundColor: '#1A2027',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.setMenu(null);
  // Closing the drop window only hides it; Quit in the tray menu ends the app.
  win.on('close', (event) => {
    if (!state.quitting) {
      event.preventDefault();
      win.hide();
    }
  });
  win.on('show', writeStatus);
  win.on('hide', writeStatus);
  // A file dropped beside the drop zone must not replace the page.
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'drop.html'));
  state.dropWindow = win;
  return win;
}

function showDropWindow() {
  folderChanged();
  const win = state.dropWindow && !state.dropWindow.isDestroyed() ? state.dropWindow : createDropWindow();
  if (win.webContents.isLoading()) {
    win.once('ready-to-show', () => {
      win.show();
      win.focus();
    });
  } else {
    win.show();
    win.focus();
  }
}

function setStartWithWindows(on) {
  state.settings.startWithWindows = !!on;
  settingsStore.save(app.getPath('userData'), state.settings);
  autostart.apply(app, state.settings.startWithWindows);
  refreshMenu();
  writeStatus();
}

function setLanguage(code) {
  state.settings.language = code;
  settingsStore.save(app.getPath('userData'), state.settings);
  state.t = i18n.load(code);
  refreshMenu();
  if (state.dropWindow && !state.dropWindow.isDestroyed()) {
    state.dropWindow.setTitle(state.t('drop.title'));
    state.dropWindow.webContents.send('toolbox:texts-changed');
  }
  writeStatus();
}

function aboutTexts() {
  const t = state.t;
  return {
    title: t('about.title'),
    message: t('about.message', { version: app.getVersion() }),
    detail: t('about.detail'),
    buttons: [t('about.ok')],
  };
}

function showAbout() {
  const texts = aboutTexts();
  return dialog.showMessageBox({
    type: 'info',
    title: texts.title,
    message: texts.message,
    detail: texts.detail,
    buttons: texts.buttons,
    icon: nativeImage.createFromPath(path.join(ICONS, 'app_256px.png')),
    noLink: true,
  });
}

function quit() {
  state.quitting = true;
  if (state.tray && !state.tray.isDestroyed()) state.tray.destroy();
  // alive.json goes first (the router runs as one copy, FORMAT.md 6.4); a slow disk does not hold up quitting.
  const closing = state.folder ? state.folder.close() : Promise.resolve();
  Promise.race([closing, new Promise((r) => setTimeout(r, 1500))]).finally(() => app.quit());
}

/** the Toolbox folder's state as the drop window shows it */
function folderView() {
  const f = state.folder ? state.folder.summary() : { path: folderPath(), state: 'unknown' };
  return Object.assign(f, { mine: TF.VERSION });
}

function folderChanged() {
  if (state.dropWindow && !state.dropWindow.isDestroyed()) state.dropWindow.webContents.send('toolbox:folder-changed');
}

/** What the drop window shows about a dropped or chosen file: the first one that is not a folder. */
async function look(files) {
  const first = files.find((f) => !f.folder);
  if (!first) return null;
  if (!first.path) return { kind: 'no-path', folder: folderView() };
  const seen = await state.folder.look(first.path);
  seen.folder = folderView();
  state.lastLook = seen;
  writeStatus();
  return seen;
}

async function connectFolder() {
  state.folder = new RouterFolder({
    path: folderPath(),
    appVersion: app.getVersion(),
    program: process.execPath,
    // From a checkout Electron needs the app's folder; the installed app is the program alone.
    args: app.isPackaged ? [] : [app.getAppPath()],
    icon: path.join(ICONS, 'app_256px.png'),
  });
  await state.folder.connect();
  state.folder.start();
  folderChanged();
  writeStatus();
}

function start() {
  app.setAppUserModelId(autostart.APP_ID);
  state.settings = settingsStore.load(app.getPath('userData'));
  // The settings file marks that the app has run: from now on it alone owns "Start with Windows" (the installer
  // only sets it when there is no such file).
  if (!settingsStore.exists(app.getPath('userData'))) settingsStore.save(app.getPath('userData'), state.settings);
  state.t = i18n.load(state.settings.language);
  autostart.sync(app, state.settings.startWithWindows);

  ipcMain.handle('toolbox:texts', () => ({ texts: state.t.all(), locale: state.t.locale }));
  ipcMain.handle('toolbox:folder', () => folderView());
  ipcMain.handle('toolbox:dropped', async (event, files) => {
    if (!Array.isArray(files)) return null;
    const list = files.slice(0, 100).map((f) => ({
      name: String(f && f.name),
      size: Number(f && f.size) || 0,
      folder: !!(f && f.folder),
      path: typeof (f && f.path) === 'string' ? f.path : '',
    }));
    state.lastDrop = list.map(({ name, size, folder }) => ({ name, size, folder }));
    writeStatus();
    if (!state.folder) return null;
    return look(list);
  });

  createTray();
  createDropWindow();
  // Started by Windows at login: stay in the tray. Started by the user: show the drop window.
  if (!process.argv.includes('--autostart')) showDropWindow();
  writeStatus();
  connectFolder();
}

if (!app.requestSingleInstanceLock()) {
  // A second start: the first instance gets 'second-instance' and shows its drop window.
  app.exit(0);
} else {
  app.on('second-instance', () => {
    state.secondInstances += 1;
    if (state.t) showDropWindow();
    writeStatus();
  });
  // The app lives in the tray: closing every window does not end it.
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => {
    state.quitting = true;
  });
  app.whenReady().then(start);
}

// For the tests (they run the app through Playwright): the parts they look at.
globalThis.toolbox = { state, aboutTexts, setLanguage, setStartWithWindows, showDropWindow, quit };
