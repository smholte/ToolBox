'use strict';
// The app itself, started as the user would (through Playwright): tray, menu, drop window, one instance, the
// "Start with Windows" switch, the language setting, Quit. On Linux under a virtual screen; on GitHub's Windows
// machine against the installed app (TOOLBOX_EXE), where "Start with Windows" is checked in the registry too.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, tempDir, launch, runPlain, waitFor, clickMenu, menuItems, dropWindow } = require('./helpers');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'lang', 'en.json'), 'utf8'));
const INSTALLED = !!process.env.TOOLBOX_EXE;
// The installed app keeps its settings in its real app-data folder; from a checkout each test has its own.
const dataDir = (name) => (INSTALLED ? undefined : tempDir(name));

async function closeApp(app) {
  try {
    await clickMenu(app, 'quit');
  } catch {
    // already gone
  }
  await app.close().catch(() => {});
}

test('starts with the tray icon, its menu and the drop window', async () => {
  const data = dataDir('start');
  const app = await launch({ data });
  try {
    if (data) assert.ok(fs.existsSync(path.join(data, 'settings.json')), 'the first start writes the settings file');
    const items = await menuItems(app);
    assert.deepEqual(items.filter((i) => i.type !== 'separator').map((i) => i.id),
      ['open', 'autostart', 'language', 'about', 'quit']);
    assert.deepEqual(items.filter((i) => i.type !== 'separator').map((i) => i.label),
      [en['menu.open'], en['menu.autostart'], en['menu.language'], en['menu.about'], en['menu.quit']]);
    const autostartItem = items.find((i) => i.id === 'autostart');
    assert.equal(autostartItem.type, 'checkbox');
    const language = items.find((i) => i.id === 'language');
    assert.deepEqual(language.submenu.map((i) => [i.label, i.checked]), [['English', true]]);
    const tooltip = await app.evaluate(() => globalThis.toolbox.state.tray.getToolTip ? globalThis.toolbox.state.tray.getToolTip() : null);
    if (tooltip !== null) assert.equal(tooltip, en['tray.tooltip']);

    const page = await dropWindow(app);
    await waitFor(async () => (await page.textContent('#hint')) === en['drop.hint'], 'the hint text');
    assert.equal(await page.title(), en['drop.title']);
    assert.equal(await app.evaluate(() => globalThis.toolbox.state.dropWindow.isVisible()), true);

    const about = await app.evaluate(() => globalThis.toolbox.aboutTexts());
    const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    assert.equal(about.message, 'Fresing ToolBox ' + version);
    assert.equal(about.title, en['about.title']);
  } finally {
    await closeApp(app);
  }
});

test('the drop window shows a dropped file\'s name and size, and closing it only hides it', async () => {
  const app = await launch({ data: dataDir('drop') });
  try {
    const page = await dropWindow(app);
    await waitFor(async () => (await page.textContent('#hint')) === en['drop.hint'], 'the texts');
    const drop = (files) => page.evaluate((list) => {
      const dt = new DataTransfer();
      for (const f of list) dt.items.add(new File([new Uint8Array(f.size)], f.name));
      for (const type of ['dragenter', 'dragover', 'drop']) {
        document.getElementById('zone').dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
      }
    }, files);

    await drop([{ name: 'bracket.step', size: 1536 }]);
    assert.equal(await page.textContent('#name'), 'bracket.step');
    assert.equal(await page.textContent('#size'), '1.5 KB');
    assert.equal(await page.textContent('#more'), '');
    assert.equal(await page.isVisible('#hint'), false);
    const last = await waitFor(() => app.evaluate(() => globalThis.toolbox.state.lastDrop), 'the drop to reach the app');
    assert.deepEqual(last, [{ name: 'bracket.step', size: 1536, folder: false }]);

    await drop([{ name: 'plan <b>1</b>.json', size: 20 }, { name: 'b.txt', size: 1 }, { name: 'c.txt', size: 2 }]);
    assert.equal(await page.textContent('#name'), 'plan <b>1</b>.json', 'a name is shown as text, never as markup');
    assert.equal(await page.textContent('#size'), '20 bytes');
    assert.equal(await page.textContent('#more'), 'and 2 more');
    assert.ok((await page.url()).endsWith('drop.html'), 'the page stayed');

    // The window's close button hides it; the app keeps running.
    await app.evaluate(() => globalThis.toolbox.state.dropWindow.close());
    await waitFor(() => app.evaluate(() => !globalThis.toolbox.state.dropWindow.isVisible()), 'the window to hide');
    assert.equal(await app.evaluate(() => globalThis.toolbox.state.tray.isDestroyed()), false);
    await clickMenu(app, 'open');
    await waitFor(() => app.evaluate(() => globalThis.toolbox.state.dropWindow.isVisible()), 'the window to show again');
  } finally {
    await closeApp(app);
  }
});

test('one instance only: a second start ends and brings up the first one\'s drop window', async () => {
  const data = dataDir('single');
  const app = await launch({ data, args: ['--autostart'] });
  try {
    assert.equal(await app.evaluate(() => globalThis.toolbox.state.dropWindow.isVisible()), false,
      'started by Windows at login: no window');
    const code = await runPlain({ data });
    assert.equal(code, 0);
    await waitFor(() => app.evaluate(() => globalThis.toolbox.state.secondInstances === 1), 'the first to hear of it');
    await waitFor(() => app.evaluate(() => globalThis.toolbox.state.dropWindow.isVisible()), 'the drop window');
  } finally {
    await closeApp(app);
  }
});

test('Start with Windows can be switched off and stays off after a restart', async () => {
  const data = dataDir('autostart');
  let app = await launch({ data, args: ['--autostart'] });
  try {
    let item = (await menuItems(app)).find((i) => i.id === 'autostart');
    assert.equal(item.checked, true, 'on after install');
    if (INSTALLED) {
      assert.equal(await app.evaluate(({ app: a }) => a.getLoginItemSettings({ args: ['--autostart'] }).openAtLogin), true,
        'the Run entry is there');
    }
    await clickMenu(app, 'autostart');
    item = (await menuItems(app)).find((i) => i.id === 'autostart');
    assert.equal(item.checked, false);
    if (INSTALLED) {
      assert.equal(await app.evaluate(({ app: a }) => a.getLoginItemSettings({ args: ['--autostart'] }).openAtLogin), false,
        'the Run entry is gone');
    }
  } finally {
    await closeApp(app);
  }
  app = await launch({ data, args: ['--autostart'] });
  try {
    const item = (await menuItems(app)).find((i) => i.id === 'autostart');
    assert.equal(item.checked, false, 'still off after a restart');
    if (INSTALLED) {
      assert.equal(await app.evaluate(({ app: a }) => a.getLoginItemSettings({ args: ['--autostart'] }).openAtLogin), false);
      // Back on, as the installer left it, for the uninstall test that follows.
      await clickMenu(app, 'autostart');
      assert.equal(await app.evaluate(({ app: a }) => a.getLoginItemSettings({ args: ['--autostart'] }).openAtLogin), true);
    }
  } finally {
    await closeApp(app);
  }
});

test('the language setting lists the language files and switches every text', { skip: INSTALLED && 'needs a second language file' }, async () => {
  const langDir = tempDir('lang');
  fs.copyFileSync(path.join(ROOT, 'app', 'lang', 'en.json'), path.join(langDir, 'en.json'));
  const zz = { _language: 'Zz test', _locale: 'de', 'menu.quit': 'ZZ quit', 'drop.hint': 'ZZ drop', 'size.kb': '{n} ZK' };
  fs.writeFileSync(path.join(langDir, 'zz.json'), JSON.stringify(zz));
  const data = dataDir('language');
  let app = await launch({ data, langDir });
  try {
    const page = await dropWindow(app);
    await waitFor(async () => (await page.textContent('#hint')) === en['drop.hint'], 'English first');
    await clickMenu(app, 'language-zz');
    const items = await menuItems(app);
    assert.equal(items.find((i) => i.id === 'quit').label, 'ZZ quit');
    assert.equal(items.find((i) => i.id === 'open').label, en['menu.open'], 'a key the language lacks stays English');
    assert.deepEqual(items.find((i) => i.id === 'language').submenu.map((i) => [i.label, i.checked]),
      [['English', false], ['Zz test', true]]);
    await waitFor(async () => (await page.textContent('#hint')) === 'ZZ drop', 'the drop window to switch');
  } finally {
    await closeApp(app);
  }
  app = await launch({ data, langDir });
  try {
    const items = await menuItems(app);
    assert.equal(items.find((i) => i.id === 'quit').label, 'ZZ quit', 'kept after a restart');
    const page = await dropWindow(app);
    await waitFor(async () => (await page.textContent('#hint')) === 'ZZ drop', 'the drop window in the language');
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(1536)], 'a.step'));
      document.getElementById('zone').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    assert.equal(await page.textContent('#size'), '1,5 ZK', 'numbers in the language\'s own way');
  } finally {
    await closeApp(app);
  }
});

test('Quit really quits', async () => {
  const app = await launch({ data: dataDir('quit') });
  const proc = app.process();
  const ended = new Promise((resolve) => proc.once('exit', (code) => resolve(code)));
  await clickMenu(app, 'quit');
  const code = await Promise.race([ended, new Promise((r) => setTimeout(() => r('still running'), 15000))]);
  assert.equal(code, 0);
  await app.close().catch(() => {});
});
