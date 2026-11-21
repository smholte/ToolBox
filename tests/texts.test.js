'use strict';
// The owner's rule (18 Nov 2026): every text the user sees comes from a language file, English complete.
// 1. No text is written straight into the app's code or pages.
// 2. Every key of en.json is used, and every key the code asks for is in en.json.
// 3. Every other language file has only keys English has.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..', 'app');
const LANG = path.join(APP, 'lang');
const en = JSON.parse(fs.readFileSync(path.join(LANG, 'en.json'), 'utf8'));
const keys = Object.keys(en).filter((k) => !k.startsWith('_'));

// Not scanned for texts: the format's code, copied unchanged (its messages are never shown: the drop window shows
// texts from en.json only), and the adapter under it (its error messages go to the format's code, never to the user).
const NOT_SHOWN = [path.join(APP, 'vendor'), path.join(APP, 'folder.js')];

function appFiles(ext) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (NOT_SHOWN.includes(p)) continue;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(ext)) out.push(p);
    }
  };
  walk(APP);
  return out;
}

/** String literals of a JavaScript file, with their line numbers; comments are skipped. */
function literals(src) {
  const out = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line += 1; i += 1; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      line += (src.slice(i, end).match(/\n/g) || []).length;
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') { text += src[j + 1]; j += 2; continue; }
        if (src[j] === '\n') line += 1;
        text += src[j];
        j += 1;
      }
      out.push({ text, line, before: src.slice(Math.max(0, i - 40), i) });
      i = j + 1;
      continue;
    }
    if (c === '/' && /[=(,:!&|?{};]\s*$/.test(src.slice(Math.max(0, i - 20), i))) {
      // a regular expression literal: skip it
      let j = i + 1;
      let inClass = false;
      while (j < src.length && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') j += 1;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        j += 1;
      }
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return out;
}

// Places where a literal would reach the user: menu labels, dialogs, titles, tooltips, page text.
const UI_CONTEXT = /(label|title|message|detail|buttons|tooltip|body|placeholder)\s*:\s*\[?\s*$|(setToolTip|setTitle|showMessageBox|showErrorBox|alert|confirm|Notification)\s*\(\s*$|(textContent|innerText|innerHTML|title)\s*=\s*$/;
// Literals that look like words for a person: two words, or a capitalised word.
const LOOKS_LIKE_TEXT = /[A-Za-z]{2,}\s+[A-Za-z]{2,}|^[A-Z][a-z]{2,}/;

test('no text is written straight into the app code', () => {
  const found = [];
  for (const file of appFiles('.js')) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (const lit of literals(src)) {
      const lineText = lines[lit.line - 1] || '';
      if (/\/\/ not shown/.test(lineText)) continue;               // e.g. an error for the log only
      if (lit.text === 'use strict') continue;
      if (keys.includes(lit.text) || /^[\w.:-]*$/.test(lit.text) && !/^[A-Z][a-z]{2,}/.test(lit.text)) continue;
      if (UI_CONTEXT.test(lit.before) || LOOKS_LIKE_TEXT.test(lit.text)) {
        found.push(path.relative(APP, file) + ':' + lit.line + '  ' + JSON.stringify(lit.text));
      }
    }
  }
  assert.deepEqual(found, [], 'texts belong in app/lang/en.json');
});

test('no text is written straight into the app pages', () => {
  const found = [];
  for (const file of appFiles('.html')) {
    const html = fs.readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '');
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').trim();
    if (text) found.push(path.relative(APP, file) + ': ' + JSON.stringify(text.slice(0, 80)));
    for (const m of html.matchAll(/\s(title|alt|placeholder|aria-label)="([^"]*)"/g)) {
      if (m[2].trim()) found.push(path.relative(APP, file) + ': ' + m[1] + '="' + m[2] + '"');
    }
  }
  assert.deepEqual(found, [], 'pages carry data-i18n keys, the text comes from en.json');
});

test('every key in en.json is used, and every key used is in en.json', () => {
  const installer = path.resolve(APP, '..', 'tools', 'installer-texts.js');   // the installer's texts
  const sources = appFiles('.js').concat(appFiles('.html'), [installer]).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const unused = keys.filter((k) => !sources.includes("'" + k + "'") && !sources.includes('"' + k + '"'));
  assert.deepEqual(unused, [], 'keys in en.json that nothing uses');
  const asked = new Set();
  for (const m of sources.matchAll(/\bt\(\s*'([^']+)'/g)) asked.add(m[1]);
  for (const m of sources.matchAll(/data-i18n="([^"]+)"/g)) asked.add(m[1]);
  for (const m of sources.matchAll(/'(size\.[a-z]+)'/g)) asked.add(m[1]);
  const missing = [...asked].filter((k) => !Object.prototype.hasOwnProperty.call(en, k));
  assert.deepEqual(missing, [], 'keys the code asks for that en.json lacks');
  assert.ok(asked.size >= 10, 'the scan found the keys (' + asked.size + ')');
});

test('the text test itself catches a hard-written text', () => {
  const lits = literals("menu = [{ label: 'Open window' }]; x.textContent = 'Hi'; // 'in a comment'\nt('menu.open')");
  const flagged = lits.filter((l) => UI_CONTEXT.test(l.before) || LOOKS_LIKE_TEXT.test(l.text)).map((l) => l.text);
  assert.deepEqual(flagged, ['Open window', 'Hi']);
});

test('language files: valid, named, and no keys English lacks', () => {
  for (const f of fs.readdirSync(LANG)) {
    const texts = JSON.parse(fs.readFileSync(path.join(LANG, f), 'utf8'));
    assert.equal(typeof texts._language, 'string', f + ' names its language in _language');
    assert.equal(typeof texts._locale, 'string', f + ' gives a _locale for numbers');
    for (const [k, v] of Object.entries(texts)) {
      assert.ok(Object.prototype.hasOwnProperty.call(en, k), f + ': ' + k + ' is not an English key');
      assert.equal(typeof v, 'string', f + ': ' + k);
    }
  }
});
