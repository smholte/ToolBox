'use strict';
// Copies the toolbox format's code into this repository, unchanged (task 0005):
//   node tools/copy-format.js <checkout of smholte/toolbox-format> [<tag or branch name for SOURCE.md>]
// - web/toolbox-folder.js and LICENSE          -> app/vendor/toolbox-format/   (the app uses it)
// - samples/                                    -> tests/data/samples/          (the tests read them)
// - check.py, tbf/*.py, schemas/, types.json, LICENSE -> tests/format-checker/  (the tests check what the app writes)
// Each place gets a SOURCE.md naming the commit. The checkout must be clean, so the commit says what was copied.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(src, ...args) {
  return execFileSync('git', ['-C', src, ...args], { encoding: 'utf8' }).trim();
}

function copyTree(from, to, keep = () => true) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (!keep(e.name)) continue;
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyTree(a, b, keep);
    else if (e.isFile()) fs.copyFileSync(a, b);
  }
}

function main() {
  const src = path.resolve(process.argv[2] || '');
  if (!process.argv[2] || !fs.existsSync(path.join(src, 'web', 'toolbox-folder.js'))) {
    console.error('usage: node tools/copy-format.js <checkout of smholte/toolbox-format> [<tag or branch>]');
    process.exit(2);
  }
  if (git(src, 'status', '--porcelain')) {
    console.error('the checkout has changes: copy only a committed version');
    process.exit(2);
  }
  const commit = git(src, 'rev-parse', 'HEAD');
  const date = git(src, 'log', '-1', '--format=%cd', '--date=short');
  const ref = process.argv[3] || git(src, 'describe', '--tags', '--exact-match').split('\n')[0];
  const version = /const VERSION = '([0-9.]+)'/.exec(fs.readFileSync(path.join(src, 'web', 'toolbox-folder.js'), 'utf8'))[1];
  const source = (what) => [
    '# Source',
    '',
    `${what} copied unchanged from \`smholte/toolbox-format\`, format version ${version}:`,
    '',
    `- ref: \`${ref}\``,
    `- commit: \`${commit}\` (${date})`,
    '',
    'Copied with `node tools/copy-format.js <checkout> <ref>`. Do not edit these files here; change the format there',
    'and copy again. Licence: MIT (`LICENSE` beside this file).',
    '',
  ].join('\n');

  const vendor = path.join(ROOT, 'app', 'vendor', 'toolbox-format');
  fs.rmSync(vendor, { recursive: true, force: true });
  fs.mkdirSync(vendor, { recursive: true });
  fs.copyFileSync(path.join(src, 'web', 'toolbox-folder.js'), path.join(vendor, 'toolbox-folder.js'));
  fs.copyFileSync(path.join(src, 'LICENSE'), path.join(vendor, 'LICENSE'));
  fs.writeFileSync(path.join(vendor, 'SOURCE.md'), source('`toolbox-folder.js` (from `web/`) is'));

  const samples = path.join(ROOT, 'tests', 'data', 'samples');
  fs.rmSync(samples, { recursive: true, force: true });
  copyTree(path.join(src, 'samples'), samples);
  fs.copyFileSync(path.join(src, 'LICENSE'), path.join(samples, 'LICENSE'));
  fs.writeFileSync(path.join(samples, 'SOURCE.md'), source('`samples/` is'));

  const checker = path.join(ROOT, 'tests', 'format-checker');
  fs.rmSync(checker, { recursive: true, force: true });
  fs.mkdirSync(checker, { recursive: true });
  for (const f of ['check.py', 'types.json', 'LICENSE']) fs.copyFileSync(path.join(src, f), path.join(checker, f));
  copyTree(path.join(src, 'tbf'), path.join(checker, 'tbf'), (n) => n !== '__pycache__');
  copyTree(path.join(src, 'schemas'), path.join(checker, 'schemas'));
  fs.writeFileSync(path.join(checker, 'SOURCE.md'), source('The checker (`check.py`, `tbf/`, `schemas/`, `types.json`) is'));
  console.log(`copied format ${version} from ${ref} (${commit.slice(0, 7)})`);
}

main();
