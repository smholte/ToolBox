'use strict';
// The router's own settings, in its app-data folder (not part of the shared format).
const fs = require('fs');
const path = require('path');

const DEFAULTS = Object.freeze({ language: 'en', startWithWindows: true });
const FILE = 'settings.json';

function load(dir) {
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8'));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  } catch {
    stored = {};
  }
  const out = Object.assign({}, DEFAULTS);
  if (typeof stored.language === 'string') out.language = stored.language;
  if (typeof stored.startWithWindows === 'boolean') out.startWithWindows = stored.startWithWindows;
  return out;
}

/** Write through a temporary file, so a crash never leaves half a file. */
function save(dir, settings) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, FILE);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

function exists(dir) {
  return fs.existsSync(path.join(dir, FILE));
}

module.exports = { load, save, exists, DEFAULTS, FILE };
