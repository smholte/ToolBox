'use strict';
// Writes installer/texts.nsh from app/lang/en.json, so the installer's own texts come from the language file too.
// Run before every installer build (npm run dist does).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEYS = { TOOLBOX_WELCOME_TITLE: 'installer.welcome.title', TOOLBOX_WELCOME_TEXT: 'installer.welcome.text' };

/** A string for an NSIS !define: $ doubled, quotes and line breaks escaped. */
function nsisString(text) {
  return String(text).replace(/\$/g, '$$$$').replace(/"/g, '$\\"').replace(/\r?\n/g, '$\\r$\\n');
}

function texts(lang = 'en') {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'lang', lang + '.json'), 'utf8'));
  const lines = ['; Written by tools/installer-texts.js from app/lang/' + lang + '.json – do not edit.'];
  for (const [name, key] of Object.entries(KEYS)) {
    if (typeof t[key] !== 'string') throw new Error(key + ' is missing in ' + lang + '.json');
    lines.push('!define ' + name + ' "' + nsisString(t[key]) + '"');
  }
  return '﻿' + lines.join('\r\n') + '\r\n';   // UTF-8 with a byte-order mark: makensis reads it as Unicode
}

if (require.main === module) {
  fs.writeFileSync(path.join(ROOT, 'installer', 'texts.nsh'), texts(), 'utf8');
  console.log('installer/texts.nsh written');
}

module.exports = { nsisString, texts, KEYS };
