'use strict';
// "Start with Windows": a value in HKCU\Software\Microsoft\Windows\CurrentVersion\Run, written by Electron.
// The installer writes the same value on a fresh install (installer/installer.nsh) and the uninstaller removes it.
// Windows only, and only for the installed app: a development run (electron .) never registers itself.

// The app's id (AppUserModelId, package.json build.appId) is also the Run value's name: Electron's
// getLoginItemSettings finds the value by the AppUserModelId. The same name is in installer/installer.nsh.
const APP_ID = 'nl.fresing.toolbox';
const RUN_NAME = APP_ID;
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

/** At start: change the Run value only when it differs from the setting, so a start never undoes what the user
 * did in Task Manager's Startup page (Electron would rewrite that page's note on every set). */
function sync(app, on) {
  if (!supported(app)) return false;
  if (registered(app) === !!on) return false;
  return apply(app, on);
}

/** Whether Windows will start the app at login (null where it does not apply). */
function registered(app) {
  if (!supported(app)) return null;
  return app.getLoginItemSettings({ path: process.execPath, args: ARGS }).openAtLogin;
}

module.exports = { apply, sync, registered, supported, APP_ID, RUN_NAME, ARGS };
