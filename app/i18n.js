'use strict';
// Every text the user sees comes from a language file in app/lang/ (owner's decision, 18 Nov 2026).
// English is complete; a missing key in another language falls back to English.
const fs = require('fs');
const path = require('path');
const { fill } = require('./format');

// FRESING_TOOLBOX_LANG_DIR: for the tests only (a folder with a second language).
const LANG_DIR = process.env.FRESING_TOOLBOX_LANG_DIR || path.join(__dirname, 'lang');
const FALLBACK = 'en';

function readLang(code, dir = LANG_DIR) {
  return JSON.parse(fs.readFileSync(path.join(dir, code + '.json'), 'utf8'));
}

/** The language files present: [{code, name}], English first, then by name. */
function listLanguages(dir = LANG_DIR) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?\.json$/.test(f)) continue;
    const code = f.slice(0, -5);
    try {
      out.push({ code, name: String(readLang(code, dir)._language || code) });
    } catch {
      // a broken language file is left out of the list
    }
  }
  out.sort((a, b) => (a.code === FALLBACK ? -1 : b.code === FALLBACK ? 1 : a.name.localeCompare(b.name)));
  return out;
}

/** A translator for one language: t(key, vars). Unknown keys come back as the key itself. */
function load(code, dir = LANG_DIR) {
  const base = readLang(FALLBACK, dir);
  let texts = base;
  let used = FALLBACK;
  if (code && code !== FALLBACK) {
    try {
      texts = Object.assign({}, base, readLang(code, dir));
      used = code;
    } catch {
      texts = base;
    }
  }
  const t = (key, vars) => fill(Object.prototype.hasOwnProperty.call(texts, key) ? texts[key] : key, vars);
  t.code = used;
  t.locale = texts._locale || used;
  t.all = () => Object.assign({}, texts);
  return t;
}

module.exports = { listLanguages, load, fill, LANG_DIR, FALLBACK };
