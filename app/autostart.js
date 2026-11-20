'use strict';
// "Start with Windows": a value in HKCU\Software\Microsoft\Windows\CurrentVersion\Run, written by Electron.
// The installer writes the same value on a fresh install (installer/installer.nsh) and the uninstaller removes it.
// Windows only, and only for the installed app: a development run (electron .) never registers itself.

const RUN_NAME = 'nl.fresing.toolbox';   // the value's name; the same in installer/installer.nsh
const ARGS = ['--autostart'];             // so the app knows it was started by Windows and stays quiet

function supported(app) {
  return process.platform === 'win32' && app.isPackaged;
}

/** Make the Run value match the setting. Returns true when it did something. */
function apply(app, on) {
  if (!supported(app)) return false;
  app.setLoginItemSettings({ openAtLogin: !!on, path: process.execPath, args: ARGS, name: RUN_NAME });
  return true;
}

/** Whether Windows will start the app at login (null where it does not apply). */
function registered(app) {
  if (!supported(app)) return null;
  return app.getLoginItemSettings({ path: process.execPath, args: ARGS }).openAtLogin;
}

module.exports = { apply, registered, supported, RUN_NAME, ARGS };
