'use strict';
// The Toolbox folder (task 0005): the adapter (app/folder.js) under the format's own code, against the format's
// samples and its checker (Python); the router's folder (app/toolbox.js); and on Windows a file held open by another
// program and a junction. No Electron needed: plain Node, on Linux and on GitHub's Windows machine.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { ROOT, SAMPLES, PYTHON, CHECKER, tempDir, sampleFolder, check } = require('./helpers');
const adapter = require('../app/folder');
const { TF, ME, RouterFolder, folderPath, manifest, loadFormat } = require('../app/toolbox');

const WINDOWS = process.platform === 'win32';
const PLANNER = 'nl.fresing.house-planner';
const RENDER = 'nl.fresing.render';
const DONE_JOB = '20261118-195100-9f3c2a';        // the samples' round trip: a bake, done, with its reply
const WORKING_JOB = '20261118-203000-c81e55';     // being baked, and just asked to stop
const REPLY_JOB = '20261118-201500-4b7d10';       // the reply, in House Planner's inbox
const FILES = path.join(SAMPLES, 'files');
const ICON = path.join(ROOT, 'app', 'icons', 'app_256px.png');

const open = (root, me) => TF.open(adapter.directory(root), me);
const sampleManifest = (id) => JSON.parse(fs.readFileSync(path.join(SAMPLES, 'Toolbox', 'tools', id, 'toolbox.json'), 'utf8'));
const file = async (p, name) => {
  const f = await adapter.fileAt(p).getFile();
  return name ? { name, blob: f } : f;
};
const tree = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      out.push(path.relative(dir, p).split(path.sep).join('/'));
      if (e.isDirectory()) walk(p);
    }
  };
  walk(dir);
  return out.sort();
};
const temps = (dir) => tree(dir).filter((p) => /(^|\/)\.tb-[0-9a-f]+\.tmp$/.test(p));
const router = (root, extra = {}) => new RouterFolder(Object.assign({ path: root, appVersion: '0.0.0-test', program: process.execPath, icon: ICON }, extra));

function assertChecked(...paths) {
  const r = check(...paths);
  assert.ok(r.ok, "the format's checker says:\n" + r.out);
  return r.out;
}

/** A link to a folder: a junction on Windows (no administrator rights needed), a symbolic link elsewhere. */
function linkFolder(target, at) {
  fs.symlinkSync(target, at, WINDOWS ? 'junction' : 'dir');
}

// ---------------------------------------------------------------- the copied code
test('the format\'s code, samples and checker come from one commit of format 0.2', () => {
  const commit = (dir) => /commit: `([0-9a-f]{40})`/.exec(fs.readFileSync(path.join(dir, 'SOURCE.md'), 'utf8'))[1];
  const vendor = path.join(ROOT, 'app', 'vendor', 'toolbox-format');
  const checker = path.dirname(CHECKER);
  assert.equal(commit(vendor), commit(checker));
  assert.equal(commit(vendor), commit(SAMPLES));
  assert.equal(TF.VERSION, '0.2');
  const names = fs.readFileSync(path.join(checker, 'tbf', 'names.py'), 'utf8');
  assert.match(names, new RegExp(`VERSION = "${TF.VERSION.replace('.', '\\.')}"`));
  const types = JSON.parse(fs.readFileSync(path.join(checker, 'types.json'), 'utf8')).types;
  assert.deepEqual(TF.TYPES, types, 'the types in toolbox-folder.js are those of types.json');
  assert.ok(fs.existsSync(path.join(vendor, 'LICENSE')));
  assert.notEqual(loadFormat(), TF, 'each load is its own copy, and nothing is hung on the global object');
  assert.equal(globalThis.ToolboxFolder, undefined);
});

// ---------------------------------------------------------------- the adapter and the samples
function variants() {
  let seed = 7;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const base = fs.readdirSync(FILES).sort().map((n) => [n, fs.readFileSync(path.join(FILES, n))]);
  const out = base.slice();
  const names = ['a.step', 'a.STP', 'a.ifc', 'a.hpscene', 'a.hpbake', 'a.zip', 'a.glb', 'a', 'a.b.csv', 'a.json', 'a.p21'];
  for (const [, data] of base) for (let i = 0; i < 3; i += 1) out.push([names[rnd(names.length)], data]);
  const step = base.find(([n]) => n === 'sample-part.step')[1];
  out.push(['bom.step', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf, 0x20, 0x0d, 0x0a]), step])]);
  out.push(['ifc-named.step', fs.readFileSync(path.join(FILES, 'sample-building.ifc'))]);
  out.push(['empty.step', Buffer.alloc(0)], ['pdf.pdf', Buffer.from('%PDF-1.7\n')], ['glb.step', base.find(([n]) => n === 'sample-model.glb')[1]]);
  for (const [name, data] of base) {                          // damaged copies, the zips most
    for (let k = 0; k < (data[0] === 0x50 && data[1] === 0x4b ? 40 : 8); k += 1) {
      const b = Buffer.from(data);
      for (let j = 0, n = 1 + rnd(4); j < n && b.length; j += 1) b[rnd(b.length)] = rnd(256);
      out.push([name, rnd(10) < 3 ? b.subarray(0, rnd(b.length + 1)) : b]);
    }
  }
  return out;
}

test('every sample file, and damaged copies, get the type the format\'s Python gives them', async () => {
  const dir = tempDir('types');
  const cases = variants().map(([name, data], i) => {
    const p = path.join(dir, String(i), name);
    fs.mkdirSync(path.dirname(p));
    fs.writeFileSync(p, data);
    return p;
  });
  const py = spawnSync(PYTHON, [CHECKER, '--type', ...cases], { encoding: 'utf8', maxBuffer: 1 << 24 });
  assert.equal(py.status, 0, py.stderr);
  const lines = py.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, cases.length);
  const differ = [];
  const seen = new Set();
  for (let i = 0; i < cases.length; i += 1) {
    const r = await TF.detectType(await file(cases[i]), TF.TYPES, path.basename(cases[i]));
    seen.add(r.type);
    const js = `${cases[i]}: ${r.type}` + (r.note ? `  (${r.note})` : '');
    if (js !== lines[i]) differ.push([js, lines[i]]);
  }
  assert.deepEqual(differ.slice(0, 5), []);
  assert.ok(seen.size >= 9, `the cases cover many types (${[...seen]})`);
  assert.ok(cases.length > 150);
});

test('the sample Toolbox folder is read through the adapter as the format describes it', async () => {
  const root = sampleFolder();
  const at = Date.parse('2026-11-18T20:40:00+01:00');      // ten minutes after the working job's last status
  const render = await open(root, RENDER);
  const all = await render.all();
  assert.deepEqual(all.map((t) => [t.manifest.id, t.manifest.name, t.open]),
    [[PLANNER, 'House Planner', false], [RENDER, 'Fresing Render', false]]);
  assert.equal((await render.types()).length, TF.TYPES.length);
  assert.deepEqual(await render.pending(), [], 'both jobs of the render inbox have a status');
  const planner = await open(root, PLANNER);
  const done = await planner.status(RENDER, DONE_JOB);
  assert.deepEqual([done.state, done.reply, done.text], ['done', REPLY_JOB, 'Baked 8 moments']);
  const working = await planner.status(RENDER, WORKING_JOB);
  assert.deepEqual([working.state, working.fraction], ['working', 0.4]);
  assert.equal(TF.stalled(working, at), true, 'not updated for 5 minutes');
  assert.equal(await render.wantsCancel(WORKING_JOB), true);
  assert.deepEqual((await render.unfinished(at)).map((j) => j.id), [WORKING_JOB]);
  assert.deepEqual(await planner.pending(), [REPLY_JOB]);
  const taken = await planner.take(sampleManifest(PLANNER), REPLY_JOB);
  assert.deepEqual([taken.job.reply_to.job, taken.files[0].name, taken.files[0].type, taken.files[0].file.size],
    [DONE_JOB, 'sample-house.hpbake', 'hpbake', fs.statSync(path.join(FILES, 'sample-house.hpbake')).size]);
  const bytes = new Uint8Array(await taken.files[0].file.arrayBuffer());
  assert.deepEqual(Buffer.from(bytes), fs.readFileSync(path.join(root, 'tools', PLANNER, 'inbox', REPLY_JOB, 'sample-house.hpbake')));
  // and the work of a receiving tool on the samples: the cancel is answered, the folder still passes the checker
  assert.equal(await render.writeStatus(WORKING_JOB, 'cancelled', { text: 'Stopped as asked' }), true);
  assert.equal(await render.writeStatus(WORKING_JOB, 'done'), false, 'a final status is never written over');
  assert.equal((await planner.status(RENDER, WORKING_JOB)).state, 'cancelled');
  assert.equal(await planner.remove(PLANNER, REPLY_JOB), true);
  assert.deepEqual(await planner.pending(), []);
  assertChecked(root);
  assert.deepEqual(temps(root), []);
});

test('a round trip written through the adapter passes the format\'s checker at every step', async () => {
  const root = sampleFolder(true);
  const planner = await open(root, PLANNER);
  const render = await open(root, RENDER);
  const job = await planner.send({ to: RENDER, action: 'bake-house', files: [await file(path.join(FILES, 'sample-house.hpscene'))], ret: 'import-bake', title: 'Sample house – version 5' });
  assertChecked(root);
  assert.deepEqual(await render.pending(), [job]);
  const taken = await render.take(sampleManifest(RENDER), job);
  assert.equal(taken.files[0].type, 'hpscene');
  assert.equal(await render.claim(job, 'working', { fraction: 0.5, text: 'Halfway\nthere' }), true);
  assertChecked(root);
  const reply = await render.sendReply(taken.job, [await file(path.join(FILES, 'sample-house.hpbake'))], 'Baked');
  const out = assertChecked(root);
  assert.doesNotMatch(out, /WARNING/, out);
  assert.deepEqual(await planner.status(RENDER, job), Object.assign({}, await planner.status(RENDER, job), { state: 'done', reply }));
  // a job that is refused, and a cancelled one
  const bad = await planner.send({ to: RENDER, action: 'import-step', files: [await file(path.join(FILES, 'sample-part.step'))] });
  await planner.cancel(RENDER, bad);
  let err;
  try {
    await render.take(sampleManifest(RENDER), bad);
  } catch (e) {
    err = e;
  }
  assert.equal(err.code, 'cancelled');
  assert.equal(await render.refuse(bad, err), true);
  assert.equal((await planner.status(RENDER, bad)).state, 'cancelled');
  assertChecked(root);
  assert.deepEqual(temps(root), []);
});

// ---------------------------------------------------------------- the adapter itself
test('a write is whole or not at all, and no empty file appears before it', async () => {
  const dir = tempDir('write');
  const d = adapter.directory(dir);
  const h = await d.getFileHandle('a.json', { create: true });
  assert.deepEqual(fs.readdirSync(dir), [], 'getFileHandle(create) makes no empty file');
  await assert.rejects(h.getFile(), { name: 'NotFoundError' });
  let w = await h.createWritable();
  await w.write(new TextEncoder().encode('{"one": 1}'));
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n === 'a.json'), [], 'nothing under the name while it is written');
  await w.close();
  assert.equal(fs.readFileSync(path.join(dir, 'a.json'), 'utf8'), '{"one": 1}');
  await assert.rejects(w.write('more'), TypeError);
  w = await h.createWritable();
  await w.write('{"two": 2}');
  await w.abort();
  assert.equal(fs.readFileSync(path.join(dir, 'a.json'), 'utf8'), '{"one": 1}', 'an aborted write leaves the old file');
  w = await h.createWritable();
  await w.write(new Blob([new Uint8Array(3 << 20).fill(7)]));   // a Blob is streamed
  await w.write(new Uint8Array([1, 2]).buffer);
  await w.close();
  assert.equal(fs.statSync(path.join(dir, 'a.json')).size, (3 << 20) + 2);
  assert.deepEqual(fs.readdirSync(dir), ['a.json'], 'no file is left beside it');
  const f = await h.getFile();
  assert.deepEqual([f.name, f.size, typeof f.lastModified], ['a.json', (3 << 20) + 2, 'number']);
  assert.deepEqual([...new Uint8Array(await f.slice(-3).arrayBuffer())], [7, 1, 2]);
  fs.writeFileSync(path.join(dir, 'a.json'), 'changed');
  await assert.rejects(f.arrayBuffer(), { name: 'NotReadableError' }, 'a file changed after it was opened is not read');
});

test('the adapter answers with the browser\'s errors', async () => {
  const dir = tempDir('errors');
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'x.txt'), 'x');
  fs.writeFileSync(path.join(dir, 'f.txt'), 'f');
  const d = adapter.directory(dir);
  await assert.rejects(d.getFileHandle('missing.txt'), { name: 'NotFoundError' });
  await assert.rejects(d.getDirectoryHandle('missing'), { name: 'NotFoundError' });
  await assert.rejects(d.getFileHandle('sub'), { name: 'TypeMismatchError' });
  await assert.rejects(d.getDirectoryHandle('f.txt'), { name: 'TypeMismatchError' });
  for (const bad of ['', '.', '..', 'a/b', 'a\\b', 'a\0b']) {
    await assert.rejects(d.getFileHandle(bad, { create: true }), TypeError, JSON.stringify(bad));
    await assert.rejects(d.getDirectoryHandle(bad, { create: true }), TypeError, JSON.stringify(bad));
    await assert.rejects(d.removeEntry(bad), TypeError, JSON.stringify(bad));
  }
  await assert.rejects(d.removeEntry('sub'), { name: 'InvalidModificationError' }, 'a full folder needs recursive');
  await d.removeEntry('sub', { recursive: true });
  await d.removeEntry('f.txt');
  await assert.rejects(d.removeEntry('f.txt'), { name: 'NotFoundError' });
  const made = await d.getDirectoryHandle('new', { create: true });
  assert.equal(made.kind, 'directory');
  assert.equal(made.name, 'new');
  const names = [];
  for await (const [name, h] of d.entries()) names.push([name, h.kind]);
  assert.deepEqual(names, [['new', 'directory']]);
  await assert.rejects(adapter.directory(path.join(dir, 'gone')).getFileHandle('a', { create: true }), { name: 'NotFoundError' });
});

test('links and junctions are never followed: not listed as tools or jobs, not deleted through, refused as files', async () => {
  const root = sampleFolder();
  const outside = tempDir('outside');
  // a folder outside with a manifest of its own and a job folder with a file
  fs.cpSync(path.join(root, 'tools', RENDER), path.join(outside, 'nl.example.linked'), { recursive: true });
  const m = JSON.parse(fs.readFileSync(path.join(outside, 'nl.example.linked', 'toolbox.json'), 'utf8'));
  m.id = 'nl.example.linked';
  fs.writeFileSync(path.join(outside, 'nl.example.linked', 'toolbox.json'), JSON.stringify(m));
  fs.mkdirSync(path.join(outside, 'job'));
  fs.writeFileSync(path.join(outside, 'job', 'keep.txt'), 'keep me');
  linkFolder(path.join(outside, 'nl.example.linked'), path.join(root, 'tools', 'nl.example.linked'));
  const linkedJob = '20261118-210000-aaaaaa';
  linkFolder(path.join(outside, 'job'), path.join(root, 'tools', RENDER, 'inbox', linkedJob));

  const render = await open(root, RENDER);
  assert.deepEqual((await render.all()).map((t) => t.manifest.id), [PLANNER, RENDER], 'a linked tool folder is no tool');
  assert.equal(await render.tool('nl.example.linked'), null);
  const tools = adapter.directory(path.join(root, 'tools'));
  const kinds = {};
  for await (const [name, h] of tools.entries()) kinds[name] = h.kind;
  assert.equal(kinds['nl.example.linked'], 'link');
  assert.deepEqual(await render.pending(), []);
  await render.clean(Date.parse('2027-06-01T00:00:00Z'));    // long after everything
  assert.equal(fs.readFileSync(path.join(outside, 'job', 'keep.txt'), 'utf8'), 'keep me', 'cleaning up never deletes through a link');
  assert.equal(await render.remove(RENDER, linkedJob), false, 'a linked job folder is not removed');
  assert.ok(fs.existsSync(path.join(outside, 'job', 'keep.txt')));
  // a folder holding a link is deleted with the link, and what it points to stays
  const holder = path.join(root, 'tools', RENDER, 'inbox', '20261118-220000-bbbbbb');
  fs.mkdirSync(holder);
  linkFolder(path.join(outside, 'job'), path.join(holder, 'inside'));
  assert.equal(await render.remove(RENDER, '20261118-220000-bbbbbb'), true);
  assert.equal(fs.existsSync(holder), false);
  assert.equal(fs.readFileSync(path.join(outside, 'job', 'keep.txt'), 'utf8'), 'keep me');
});

test('a link in place of a job\'s file is refused as "not a plain file"', async (t) => {
  const root = sampleFolder(true);
  const planner = await open(root, PLANNER);
  const job = await planner.send({ to: RENDER, action: 'import-step', files: [await file(path.join(FILES, 'sample-part.step'))] });
  const p = path.join(root, 'tools', RENDER, 'inbox', job, 'sample-part.step');
  const elsewhere = path.join(tempDir('target'), 'sample-part.step');
  fs.renameSync(p, elsewhere);
  try {
    fs.symlinkSync(elsewhere, p, 'file');
  } catch (err) {
    t.skip(`this system does not let a program make a file link (${err.code}); Windows needs Developer Mode`);
    return;
  }
  const render = await open(root, RENDER);
  await assert.rejects(render.take(sampleManifest(RENDER), job), { code: 'bad-job', message: /not a plain file/ });
});

// ---------------------------------------------------------------- the router's folder
test('the router makes the Toolbox folder, writes its manifest, icon and alive.json, and they pass the checker', async () => {
  const root = path.join(tempDir('make'), 'Toolbox');
  const r = router(root, { appVersion: '1.2.3' });
  const s = await r.connect();
  assert.deepEqual(s, { path: root, state: 'ok', version: null, pending: [] });
  assert.deepEqual(tree(root), ['toolbox-folder.json', 'tools', `tools/${ME}`, `tools/${ME}/alive.json`,
    `tools/${ME}/icon.png`, `tools/${ME}/inbox`, `tools/${ME}/toolbox.json`]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'toolbox-folder.json'), 'utf8')), { format: 'toolbox-folder', version: '0.2' });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'tools', ME, 'toolbox.json'), 'utf8'));
  assert.deepEqual([m.id, m.name, m.kind, m.app_version, m.start.program], [ME, 'Fresing ToolBox', 'native', '1.2.3', process.execPath]);
  assert.deepEqual(m.actions.map((a) => a.id), ['take-result']);
  assert.deepEqual(m.actions[0].accepts, TF.TYPES.map((x) => x.id), 'it takes back a result of every built-in type');
  assert.deepEqual(fs.readFileSync(path.join(root, 'tools', ME, 'icon.png')), fs.readFileSync(ICON));
  const alive = JSON.parse(fs.readFileSync(path.join(root, 'tools', ME, 'alive.json'), 'utf8'));
  assert.equal(alive.app_version, '1.2.3');
  assert.equal(TF.timeProblem(alive.seen), null);
  const out = assertChecked(root);
  assert.doesNotMatch(out, /WARNING/, out);
  assert.equal(manifest({ appVersion: '1', program: '/x', args: ['/app'] }).start.args[0], '/app');
  // another tool sees it as open, and it goes away at quit
  const planner = await open(root, PLANNER);
  assert.equal((await planner.tool(ME)).open, true);
  await r.close();
  assert.equal(fs.existsSync(path.join(root, 'tools', ME, 'alive.json')), false, 'the router runs as one copy: it may delete alive.json');
  assert.equal((await planner.tool(ME)).open, false);
  assertChecked(root);
});

test('a job the router sends, and the result that comes back to it, pass the checker', async () => {
  const root = sampleFolder(true);
  const r = router(root);
  await r.connect();
  const me = await open(root, ME);
  const render = await open(root, RENDER);
  const job = await me.send({ to: RENDER, action: 'bake-house', files: [await file(path.join(FILES, 'sample-house.hpscene'))], ret: 'take-result', title: 'Dropped on ToolBox' });
  assertChecked(root);
  const taken = await render.take(sampleManifest(RENDER), job);
  const reply = await render.sendReply(taken.job, [await file(path.join(FILES, 'sample-house.hpbake'))], 'Baked');
  assert.ok(reply, 'the reply went to the router');
  assertChecked(root);
  const mine = JSON.parse(fs.readFileSync(path.join(root, 'tools', ME, 'toolbox.json'), 'utf8'));
  const back = await me.take(mine, reply);
  assert.deepEqual([back.job.action, back.files[0].type], ['take-result', 'hpbake']);
  assert.equal(await me.remove(ME, reply), true);
  assert.equal(await me.remove(RENDER, job), true);
  assertChecked(root);
  await r.close();
});

test('a folder of another version, or one that is not a Toolbox folder, is left alone', async () => {
  const old = path.join(tempDir('old'), 'Toolbox');
  fs.mkdirSync(old);
  fs.writeFileSync(path.join(old, 'toolbox-folder.json'), '{"format": "toolbox-folder", "version": "0.1"}\n');
  fs.mkdirSync(path.join(old, 'tools'));
  const before = tree(old);
  let s = await router(old).connect();
  assert.deepEqual([s.state, s.version], ['other-version', '0.1']);
  assert.deepEqual(tree(old), before);
  assert.equal(fs.readFileSync(path.join(old, 'toolbox-folder.json'), 'utf8'), '{"format": "toolbox-folder", "version": "0.1"}\n');

  const other = path.join(tempDir('other'), 'Toolbox');
  fs.mkdirSync(other);
  fs.writeFileSync(path.join(other, 'my notes.txt'), 'not a toolbox');
  s = await router(other).connect();
  assert.equal(s.state, 'not-toolbox');
  assert.deepEqual(tree(other), ['my notes.txt']);

  const empty = path.join(tempDir('empty'), 'Toolbox');
  fs.mkdirSync(path.join(empty, 'tools'), { recursive: true });
  s = await router(empty).connect();
  assert.equal(s.state, 'ok', 'an empty folder (or one with an empty tools/) is made the Toolbox folder');
  assertChecked(empty);

  const aFile = path.join(tempDir('file'), 'Toolbox');
  fs.writeFileSync(aFile, 'x');
  assert.equal((await router(aFile).connect()).state, 'not-a-folder');
  const noParent = path.join(tempDir('noparent'), 'missing', 'Toolbox');
  assert.equal((await router(noParent).connect()).state, 'error');
  assert.equal(fs.existsSync(path.dirname(noParent)), false, 'only the Toolbox folder itself is made, never its parents');
});

test('a Toolbox folder deleted while the router runs is made again at the next tick', async () => {
  const root = path.join(tempDir('gone'), 'Toolbox');
  const r = router(root);
  await r.connect();
  fs.rmSync(root, { recursive: true });
  await r.tick();
  await r.tick();
  assert.equal(r.state, 'ok');
  assertChecked(root);
  assert.ok(fs.existsSync(path.join(root, 'tools', ME, 'toolbox.json')));
  await r.close();
});

test('where the folder is: the test hook, then TOOLBOX_HOME, then the home folder', () => {
  const home = require('os').homedir();
  assert.equal(folderPath({}), path.join(home, 'Toolbox'));
  assert.equal(folderPath({ TOOLBOX_HOME: path.join(home, 'Elsewhere') }), path.join(home, 'Elsewhere'));
  assert.equal(folderPath({ TOOLBOX_HOME: path.join(home, 'Elsewhere'), FRESING_TOOLBOX_FOLDER: path.join(home, 'Test') }), path.join(home, 'Test'));
});

test('a dropped file: its type by content and the tools that take it', async () => {
  const root = sampleFolder(true);
  const r = router(root);
  await r.connect();
  const dir = tempDir('dropped');
  const at = (name, from) => {
    const p = path.join(dir, name);
    fs.copyFileSync(path.join(FILES, from), p);
    return p;
  };
  let s = await r.look(at('bracket.step', 'sample-part.step'));
  assert.deepEqual([s.kind, s.type, s.typeName, s.note, s.tools.map((t) => t.name)], ['file', 'step', 'STEP model', null, ['Fresing Render']]);
  s = await r.look(at('house.hpscene', 'sample-house.hpscene'));
  assert.deepEqual([s.type, s.typeName, s.tools.map((t) => t.name)], ['hpscene', 'House Planner scene', ['Fresing Render']]);
  s = await r.look(at('notes.unknownkind', 'sample.unknownkind'));
  assert.deepEqual([s.type, s.typeName, s.ext, s.tools], ['ext:unknownkind', null, '.unknownkind', []]);
  s = await r.look(at('building.step', 'sample-building.ifc'));
  assert.deepEqual([s.type, s.note, s.tools.map((t) => t.name)], ['ifc', { kind: 'content', typeName: 'IFC building model' }, ['House Planner']]);
  s = await r.look(at('fake.hpscene', 'sample-archive.zip'));
  assert.deepEqual([s.type, s.note], ['ext:hpscene', { kind: 'name', typeName: 'House Planner scene' }]);
  assert.equal((await r.look(dir)).kind, 'folder');
  assert.equal((await r.look(path.join(dir, 'nothing.step'))).kind, 'missing');
  // the router itself takes back every type, but is never offered as a tool for a dropped file
  assert.ok(!(await r.look(at('again.step', 'sample-part.step'))).tools.some((t) => t.id === ME));
  // a tool added a moment ago is there at the next look
  fs.cpSync(path.join(root, 'tools', RENDER), path.join(root, 'tools', 'nl.example.viewer'), { recursive: true });
  const viewer = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'nl.example.viewer', 'toolbox.json'), 'utf8'));
  Object.assign(viewer, { id: 'nl.example.viewer', name: 'Example Viewer' });
  fs.writeFileSync(path.join(root, 'tools', 'nl.example.viewer', 'toolbox.json'), JSON.stringify(viewer));
  s = await r.look(at('bracket2.step', 'sample-part.step'));
  assert.deepEqual(s.tools.map((t) => t.name), ['Example Viewer', 'Fresing Render']);
  await r.close();
});

// ---------------------------------------------------------------- a write another program refuses (Windows)
// Measured on GitHub's Windows Server 2025 (task 0005): Node replaces and deletes a file even while another program
// holds it open, whatever that program's sharing – Node renames and deletes with the newer "POSIX" semantics of
// NTFS. (Python's os.replace does not, which is why Fresing Render's writes are refused: the format's CLAUDE.md.)
// So on Windows a held file is tested as it really behaves, and a refusal – which can still come, e.g. on a drive
// without those semantics – is forced inside the process, on every system.

/** Hold a file open in another program (PowerShell) for `ms`; resolves once it is held, with a promise for its end. */
function holdOpen(p, ms, access = 'Read', share = 'Read') {
  const script = `$ErrorActionPreference = 'Stop'; $f = [System.IO.File]::Open('${p.replace(/'/g, "''")}', 'Open', '${access}', '${share}'); [Console]::Out.WriteLine('held'); [Console]::Out.Flush(); Start-Sleep -Milliseconds ${ms}; $f.Close()`;
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['ignore', 'pipe', 'inherit'] });
  const ended = new Promise((ok) => child.on('exit', ok));
  return new Promise((ok, fail) => {
    child.stdout.on('data', (d) => { if (String(d).includes('held')) ok(ended); });
    child.on('exit', () => fail(new Error('the holder ended before it held the file')));
  });
}

test('Windows: a file held open by another program – the write is whole, nothing is left beside it, a job folder still goes', { skip: !WINDOWS && 'Windows only' }, async (t) => {
  const seen = [];
  for (const [access, share] of [['Read', 'Read'], ['Read', 'ReadWrite'], ['Read', 'None'], ['ReadWrite', 'None']]) {
    const dir = tempDir('held');
    fs.mkdirSync(path.join(dir, 'job'));
    const p = path.join(dir, 'job', 'status.json');
    fs.writeFileSync(p, 'old');
    const ended = await holdOpen(p, 2000, access, share);
    let write = 'replaced';
    const w = await (await adapter.directory(path.join(dir, 'job')).getFileHandle('status.json')).createWritable();
    await w.write('new');
    try {
      await w.close();
    } catch (err) {
      assert.equal(err.name, 'NoModificationAllowedError');
      write = 'refused';
    }
    assert.equal(fs.readFileSync(p, 'utf8'), write === 'replaced' ? 'new' : 'old', 'whole or not at all');
    assert.deepEqual(fs.readdirSync(path.join(dir, 'job')), ['status.json'], 'nothing left beside it');
    let del = 'deleted';
    try {
      await adapter.directory(dir).removeEntry('job', { recursive: true });
    } catch (err) {
      assert.equal(err.name, 'NoModificationAllowedError');
      del = 'refused';
    }
    await ended;
    seen.push(`${access}/${share}: write ${write}, delete ${del}`);
  }
  t.diagnostic(seen.join('; '));
});

/** Make every rename refused (as Windows refuses one) until `until()` says stop; returns the undo. */
function refuseRenames(until) {
  const fsp = require('fs/promises');
  const real = fsp.rename;
  let refused = 0;
  fsp.rename = async (a, b) => {
    if (until(refused)) return real(a, b);
    refused += 1;
    const err = new Error('EPERM: operation not permitted, rename');
    err.code = 'EPERM';
    throw err;
  };
  return { undo: () => { fsp.rename = real; }, count: () => refused };
}

test('a refused replace: tried a few times, then NoModificationAllowedError, the old file whole, nothing left beside it', async () => {
  const dir = tempDir('refused');
  fs.writeFileSync(path.join(dir, 'status.json'), 'old');
  const h = await adapter.directory(dir).getFileHandle('status.json');
  let r = refuseRenames(() => false);
  try {
    const w = await h.createWritable();
    await w.write('new');
    await assert.rejects(w.close(), { name: 'NoModificationAllowedError' });
    assert.equal(r.count(), adapter.REPLACE_TRIES.count);
  } finally {
    r.undo();
  }
  assert.equal(fs.readFileSync(path.join(dir, 'status.json'), 'utf8'), 'old');
  assert.deepEqual(fs.readdirSync(dir), ['status.json']);
  r = refuseRenames((n) => n >= 2);               // let go after two tries: the write gets through
  try {
    const w = await h.createWritable();
    await w.write('new');
    await w.close();
  } finally {
    r.undo();
  }
  assert.equal(fs.readFileSync(path.join(dir, 'status.json'), 'utf8'), 'new');
  assert.deepEqual(fs.readdirSync(dir), ['status.json']);
});

test('a refused status write: a working one waits for the next update, a final one keeps trying and is written (W3)', async () => {
  const root = sampleFolder(true);
  const planner = await open(root, PLANNER);
  const render = await open(root, RENDER);
  const job = await planner.send({ to: RENDER, action: 'import-step', files: [await file(path.join(FILES, 'sample-part.step'))] });
  await render.claim(job, 'working', { fraction: 0.1 });
  const status = path.join(root, 'tools', RENDER, 'inbox', job, 'status.json');
  let r = refuseRenames(() => false);
  try {
    assert.equal(await render.writeStatus(job, 'working', { fraction: 0.2 }), false, 'not written now: the job goes on');
  } finally {
    r.undo();
  }
  assert.equal(JSON.parse(fs.readFileSync(status, 'utf8')).fraction, 0.1);
  const start = Date.now();
  r = refuseRenames(() => Date.now() - start > 700);        // held for 0.7 s
  try {
    assert.equal(await render.writeStatus(job, 'done', { text: 'Imported' }), true, 'a final status keeps trying (2 s) and is written');
  } finally {
    r.undo();
  }
  assert.equal(JSON.parse(fs.readFileSync(status, 'utf8')).state, 'done');
  assertChecked(root);
  assert.deepEqual(temps(root), []);
});

test('a refused write of the router\'s manifest does not stop the app; it is written at the next tick', async () => {
  const root = path.join(tempDir('refusedmanifest'), 'Toolbox');
  const r = router(root, { appVersion: '1.0.0' });
  await r.connect();
  r.opts.appVersion = '1.0.1';
  const refuse = refuseRenames(() => false);
  let s;
  try {
    s = await r.connect();
    await r.tick();
  } finally {
    refuse.undo();
  }
  assert.equal(s.state, 'ok', 'a refused write does not stop the app');
  assert.ok(s.pending.includes('manifest'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'tools', ME, 'toolbox.json'), 'utf8')).app_version, '1.0.0');
  await r.tick();
  assert.deepEqual(r.summary().pending, []);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'tools', ME, 'toolbox.json'), 'utf8')).app_version, '1.0.1');
  assertChecked(root);
  assert.deepEqual(temps(root), []);
  await r.close();
});

// ---------------------------------------------------------------- from the independent review (task 0005)
/** Replace one function of fs/promises for the length of `fn`. */
async function patched(name, replacement, fn) {
  const fsp = require('fs/promises');
  const real = fsp[name];
  fsp[name] = (...args) => replacement(real, ...args);
  try {
    return await fn();
  } finally {
    fsp[name] = real;
  }
}
const eperm = (what) => Object.assign(new Error(`EPERM: operation not permitted, ${what}`), { code: 'EPERM' });

test('review: tools/ or the router\'s own folder deleted while it runs is made again whole at the next tick', async () => {
  const root = path.join(tempDir('toolsgone'), 'Toolbox');
  const r = router(root);
  await r.connect();
  for (const gone of [path.join(root, 'tools'), path.join(root, 'tools', ME)]) {
    fs.rmSync(gone, { recursive: true });
    await r.tick();
    await r.tick();
    assert.equal(r.state, 'ok');
    assert.deepEqual(tree(path.join(root, 'tools', ME)), ['alive.json', 'icon.png', 'inbox', 'toolbox.json'], gone);
    const out = assertChecked(root);
    assert.doesNotMatch(out, /WARNING/, out);
  }
  await r.close();
});

test('review: a tools/ that is a link is not followed; the folder counts as not a Toolbox folder', async () => {
  const root = path.join(tempDir('toolslink'), 'Toolbox');
  const outside = tempDir('toolsoutside');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'toolbox-folder.json'), '{"format": "toolbox-folder", "version": "0.2"}\n');
  linkFolder(outside, path.join(root, 'tools'));
  const r = router(root);
  assert.equal((await r.connect()).state, 'not-toolbox');
  assert.deepEqual(fs.readdirSync(outside), [], 'nothing written through the link');
  assert.deepEqual(await r.tools(), []);
  await r.close();
});

test('review: a refused look at the file being replaced is a refused write too (a working status waits, never throws)', async () => {
  const root = sampleFolder(true);
  const planner = await open(root, PLANNER);
  const render = await open(root, RENDER);
  const job = await planner.send({ to: RENDER, action: 'import-step', files: [await file(path.join(FILES, 'sample-part.step'))] });
  await render.claim(job, 'working', { fraction: 0.1 });
  const status = path.join(root, 'tools', RENDER, 'inbox', job, 'status.json');
  const refuse = (real, p, ...rest) => (path.resolve(String(p)) === path.resolve(status) && !(rest[0] && rest[0].bigint) ? Promise.reject(eperm('lstat')) : real(p, ...rest));
  const h = adapter.fileAt(status);
  // the status is read by the format's code first (NotReadableError: half there, next time); the write then refused
  await patched('lstat', refuse, async () => {
    const w = await h.createWritable();
    await w.write('x');
    await assert.rejects(w.close(), { name: 'NoModificationAllowedError' });
  });
  assert.equal(JSON.parse(fs.readFileSync(status, 'utf8')).fraction, 0.1);
  assert.deepEqual(temps(root), []);
});

test('review: a folder swapped for a link while it is deleted is not gone into', async () => {
  const dir = tempDir('swap');
  const outside = tempDir('swapoutside');
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'keep me');
  fs.mkdirSync(path.join(dir, 'job', 'sub'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'job', 'sub', 'a.txt'), 'a');
  const sub = path.join(dir, 'job', 'sub');
  let swapped = false;
  await patched('readdir', async (real, p, ...rest) => {
    if (!swapped && path.resolve(String(p)) === sub) {
      swapped = true;
      fs.renameSync(sub, path.join(dir, 'moved'));
      linkFolder(outside, sub);
    }
    return real(p, ...rest);
  }, async () => {
    await assert.rejects(adapter.directory(dir).removeEntry('job', { recursive: true }), { name: 'NoModificationAllowedError' });
  });
  assert.ok(swapped);
  assert.equal(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8'), 'keep me');
});

test('review: a half-deleted job folder has lost its job.json first, so it is never taken for a new job', async () => {
  const root = sampleFolder(true);
  const planner = await open(root, PLANNER);
  const render = await open(root, RENDER);
  const job = await planner.send({ to: RENDER, action: 'import-step', files: [await file(path.join(FILES, 'sample-part.step'))] });
  await render.writeStatus(job, 'done');
  await patched('unlink', (real, p) => (path.basename(String(p)) === 'job.json' ? real(p) : Promise.reject(eperm('unlink'))), async () => {
    assert.equal(await render.remove(RENDER, job), false, 'refused: tried again at the next look');
  });
  const left = fs.readdirSync(path.join(root, 'tools', RENDER, 'inbox', job)).sort();
  assert.deepEqual(left, ['sample-part.step', 'status.json']);
  assert.deepEqual(await render.pending(), []);
  assert.equal(await render.remove(RENDER, job), true);
});

test('review: what a crash left of a write is cleared when the router connects; a fresh one stays', async () => {
  const root = path.join(tempDir('temps'), 'Toolbox');
  const r = router(root);
  await r.connect();
  const old = Date.now() / 1000 - 3600;
  const own = path.join(root, 'tools', ME);
  for (const [dir, name, age] of [[root, '.tb-00000000000a.tmp', old], [own, '.tb-00000000000b.tmp', old], [own, '.tb-00000000000c.tmp', null]]) {
    fs.writeFileSync(path.join(dir, name), 'half');
    if (age) fs.utimesSync(path.join(dir, name), age, age);
  }
  await r.connect();
  assert.deepEqual(temps(root), ['tools/nl.fresing.toolbox/.tb-00000000000c.tmp']);
  await r.close();
});

test('review: names Windows would change are refused on Windows', { skip: !WINDOWS && 'Windows only' }, async () => {
  const d = adapter.directory(tempDir('winnames'));
  for (const bad of ['a:b', 'a.', 'a ']) await assert.rejects(d.getFileHandle(bad, { create: true }), TypeError, bad);
});
