'use strict';
// The app itself, started as the user would (through Playwright): tray, menu, drop window, one instance, the
// "Start with Windows" switch, the language setting, Quit. On Linux under a virtual screen; on GitHub's Windows
// machine against the installed app (TOOLBOX_EXE), where "Start with Windows" is checked in the registry too.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, SAMPLES, tempDir, launch, runPlain, waitFor, clickMenu, menuItems, dropWindow, sampleFolder, check } = require('./helpers');

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
    await waitFor(() => app.evaluate(() => globalThis.toolbox.state.dropWindow.isVisible()), 'the drop window to show');

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

// ---------------------------------------------------------------- the Toolbox folder (task 0005)
const fill = (key, vars) => en[key].replace(/\{(\w+)\}/g, (m, k) => vars[k]);
const folderState = (app) => app.evaluate(() => globalThis.toolbox.state.folder && globalThis.toolbox.state.folder.summary());

test('at start the Toolbox folder is made, with the router\'s manifest and alive.json; at Quit alive.json goes', async () => {
  const folder = path.join(tempDir('made'), 'Toolbox');
  const app = await launch({ data: dataDir('made'), folder, args: ['--autostart'] });
  const proc = app.process();
  try {
    const s = await waitFor(async () => { const f = await folderState(app); return f && f.state === 'ok' && f; }, 'the folder');
    assert.equal(s.path, folder);
    for (const f of ['toolbox-folder.json', 'tools/nl.fresing.toolbox/toolbox.json', 'tools/nl.fresing.toolbox/alive.json', 'tools/nl.fresing.toolbox/icon.png']) {
      assert.ok(fs.existsSync(path.join(folder, f)), f);
    }
    const r = check(folder);
    assert.ok(r.ok && !/WARNING/.test(r.out), r.out);
    const m = JSON.parse(fs.readFileSync(path.join(folder, 'tools', 'nl.fresing.toolbox', 'toolbox.json'), 'utf8'));
    const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    assert.equal(m.app_version, version);
    assert.ok(path.isAbsolute(m.start.program) && fs.existsSync(m.start.program), m.start.program);
    if (INSTALLED) assert.equal(m.start.args, undefined, 'the installed app is started by its program alone');
  } finally {
    const ended = new Promise((resolve) => proc.once('exit', resolve));
    await clickMenu(app, 'quit').catch(() => {});
    await Promise.race([ended, new Promise((r) => setTimeout(r, 15000))]);
    await app.close().catch(() => {});
  }
  assert.equal(fs.existsSync(path.join(folder, 'tools', 'nl.fresing.toolbox', 'alive.json')), false);
  assert.ok(fs.existsSync(path.join(folder, 'tools', 'nl.fresing.toolbox', 'toolbox.json')), 'the manifest stays');
});

test('a chosen or dropped file shows its type by content and the tools that take it', async () => {
  const folder = sampleFolder(true);
  const app = await launch({ data: dataDir('types'), folder });
  try {
    const page = await dropWindow(app);
    await waitFor(async () => (await page.textContent('#hint')) === en['drop.hint'], 'the texts');
    await waitFor(async () => { const f = await folderState(app); return f && f.state === 'ok'; }, 'the folder');
    const dir = tempDir('chosen');
    const choose = async (name, from) => {
      const p = path.join(dir, name);
      fs.copyFileSync(path.join(SAMPLES, 'files', from), p);
      const before = await app.evaluate(() => globalThis.toolbox.state.lastLook);
      await page.setInputFiles('#pick', p);
      await waitFor(() => app.evaluate((b) => globalThis.toolbox.state.lastLook !== b && globalThis.toolbox.state.lastLook, before), 'the app to look at ' + name);
      await waitFor(async () => (await page.textContent('#type')) !== '', 'the type line');
      return { name: await page.textContent('#name'), type: await page.textContent('#type'), note: await page.textContent('#typenote'), tools: await page.textContent('#tools') };
    };
    assert.deepEqual(await choose('bracket.step', 'sample-part.step'),
      { name: 'bracket.step', type: fill('drop.type', { type: 'STEP model' }), note: '', tools: fill('drop.tools', { tools: 'Fresing Render' }) });
    assert.deepEqual(await choose('house.hpscene', 'sample-house.hpscene'),
      { name: 'house.hpscene', type: fill('drop.type', { type: 'House Planner scene' }), note: '', tools: fill('drop.tools', { tools: 'Fresing Render' }) });
    assert.deepEqual(await choose('notes.xyz', 'sample.unknownkind'),
      { name: 'notes.xyz', type: fill('drop.type-unknown', { ext: '.xyz' }), note: '', tools: en['drop.no-tools'] });
    assert.deepEqual(await choose('building.step', 'sample-building.ifc'),
      { name: 'building.step', type: fill('drop.type', { type: 'IFC building model' }), note: fill('drop.note-content', { type: 'IFC building model', ext: '.step' }), tools: fill('drop.tools', { tools: 'House Planner' }) });
    const look = await app.evaluate(() => globalThis.toolbox.state.lastLook);
    assert.deepEqual([look.type, look.kind], ['ifc', 'file']);
    // A file the window cannot place (made in the page, as one dragged from a browser): said plainly.
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(10)], 'made.step'));
      document.getElementById('zone').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await waitFor(async () => (await page.textContent('#type')) === en['drop.no-path'], 'the no-path line');
    assert.equal(await page.textContent('#name'), 'made.step');
    assert.equal(await page.isVisible('#folder'), false, 'no folder line while the folder is fine');
  } finally {
    await closeApp(app);
  }
});

test('a Toolbox folder of another version is left alone, and the drop window says so in one line', async () => {
  const folder = path.join(tempDir('old'), 'Toolbox');
  fs.mkdirSync(path.join(folder, 'tools'), { recursive: true });
  const marker = '{"format": "toolbox-folder", "version": "0.1"}\n';
  fs.writeFileSync(path.join(folder, 'toolbox-folder.json'), marker);
  const app = await launch({ data: dataDir('old'), folder });
  try {
    const page = await dropWindow(app);
    const line = fill('folder.other-version', { path: folder, version: '0.1', mine: '0.2' });
    await waitFor(async () => (await page.textContent('#folder')) === line, 'the folder line');
    assert.equal(await page.isVisible('#folder'), true);
    assert.equal(fs.readFileSync(path.join(folder, 'toolbox-folder.json'), 'utf8'), marker);
    assert.deepEqual(fs.readdirSync(path.join(folder, 'tools')), []);
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
