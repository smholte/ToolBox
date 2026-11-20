'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./helpers');
const i18n = require('../app/i18n');
const settings = require('../app/settings');
const { formatSize, fill } = require('../app/format');

const en = i18n.load('en');

test('sizes read as people say them', () => {
  assert.equal(formatSize(0, en, 'en'), '0 bytes');
  assert.equal(formatSize(1023, en, 'en'), '1,023 bytes');
  assert.equal(formatSize(1536, en, 'en'), '1.5 KB');
  assert.equal(formatSize(100 * 1024 * 1024, en, 'en'), '100 MB');
  assert.equal(formatSize(3.25 * 1024 ** 3, en, 'en'), '3.3 GB');
  assert.equal(formatSize(5 * 1024 ** 4, en, 'en'), '5,120 GB');
  assert.equal(formatSize(1536, en, 'nl'), '1,5 KB');
  assert.equal(formatSize(NaN, en, 'en'), '0 bytes');
});

test('placeholders are filled, unknown ones are left', () => {
  assert.equal(fill('{name} is a folder', { name: 'Parts' }), 'Parts is a folder');
  assert.equal(fill('{a} {b}', { a: 1 }), '1 {b}');
  assert.equal(fill('{constructor}', {}), '{constructor}');
  assert.equal(fill('plain'), 'plain');
});

test('English is the fallback; another language overrides only its own keys', () => {
  const dir = tempDir('lang');
  fs.copyFileSync(path.join(i18n.LANG_DIR, 'en.json'), path.join(dir, 'en.json'));
  fs.writeFileSync(path.join(dir, 'nl.json'), JSON.stringify({ _language: 'Nederlands', _locale: 'nl', 'menu.quit': 'Afsluiten' }));
  fs.writeFileSync(path.join(dir, 'xx.json'), '{ broken');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a language');
  const nl = i18n.load('nl', dir);
  assert.equal(nl('menu.quit'), 'Afsluiten');
  assert.equal(nl('menu.open'), 'Open drop window');
  assert.equal(nl.code, 'nl');
  assert.equal(nl.locale, 'nl');
  assert.equal(i18n.load('fr', dir).code, 'en', 'a missing language falls back to English');
  assert.equal(nl('no.such.key'), 'no.such.key');
  assert.deepEqual(i18n.listLanguages(dir), [{ code: 'en', name: 'English' }, { code: 'nl', name: 'Nederlands' }]);
});

test('settings: defaults, saved and read back, damaged file', () => {
  const dir = tempDir('settings');
  assert.deepEqual(settings.load(dir), { language: 'en', startWithWindows: true });
  settings.save(dir, { language: 'nl', startWithWindows: false });
  assert.deepEqual(settings.load(dir), { language: 'nl', startWithWindows: false });
  assert.deepEqual(fs.readdirSync(dir), ['settings.json'], 'no temporary file is left');
  fs.writeFileSync(path.join(dir, 'settings.json'), '[1,2]');
  assert.deepEqual(settings.load(dir), settings.DEFAULTS);
  fs.writeFileSync(path.join(dir, 'settings.json'), '{"startWithWindows": "no", "language": 7}');
  assert.deepEqual(settings.load(dir), settings.DEFAULTS);
  fs.writeFileSync(path.join(dir, 'settings.json'), 'not json');
  assert.deepEqual(settings.load(dir), settings.DEFAULTS);
});

test('installer texts: escaped for NSIS, taken from en.json', () => {
  const { nsisString, texts, KEYS } = require('../tools/installer-texts');
  assert.equal(nsisString('a "b" $c\nd'), 'a $\\"b$\\" $$c$\\r$\\nd');
  const nsh = texts();
  assert.ok(nsh.startsWith('﻿'), 'UTF-8 with a byte-order mark');
  const en = JSON.parse(fs.readFileSync(path.join(i18n.LANG_DIR, 'en.json'), 'utf8'));
  for (const [name, key] of Object.entries(KEYS)) {
    assert.ok(nsh.includes('!define ' + name + ' "' + nsisString(en[key]) + '"'), name);
  }
});
