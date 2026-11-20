'use strict';
// Fresing ToolBox – the router's frame (task 0004): a tray icon with its menu, one instance only, and a small drop
// window that shows the name and size of a dropped file. Handing files to tools comes in tasks 0005–0007.

const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const i18n = require('./i18n');
const settingsStore = require('./settings');
const autostart = require('./autostart');

const APP_ID = 'nl.fresing.toolbox';
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
};

function writeStatus() {
  if (!STATUS_FILE) return;
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
  };
  try {
    fs.writeFileSync(STATUS_FILE + '.tmp', JSON.stringify(status, null, 2));
    fs.renameSync(STATUS_FILE + '.tmp', STATUS_FILE);
  } catch {
    // the status file is for the tests; the app goes on without it
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
    width: 380,
    height: 280,
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
  app.quit();
}

function start() {
  app.setAppUserModelId(APP_ID);
  state.settings = settingsStore.load(app.getPath('userData'));
  state.t = i18n.load(state.settings.language);
  autostart.apply(app, state.settings.startWithWindows);

  ipcMain.handle('toolbox:texts', () => ({ texts: state.t.all(), locale: state.t.locale }));
  ipcMain.on('toolbox:dropped', (event, files) => {
    if (!Array.isArray(files)) return;
    state.lastDrop = files.slice(0, 100).map((f) => ({
      name: String(f && f.name),
      size: Number(f && f.size) || 0,
      folder: !!(f && f.folder),
    }));
    writeStatus();
  });

  createTray();
  createDropWindow();
  // Started by Windows at login: stay in the tray. Started by the user: show the drop window.
  if (!process.argv.includes('--autostart')) showDropWindow();
  writeStatus();
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
