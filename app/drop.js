'use strict';
// The drop window: shows the name and size of what is dropped on it (or chosen with a click), then what the app
// found: its type by content and the tools that take it. Every text comes from the language file.
(function () {
  const fmt = window.ToolboxFormat;
  const $ = (id) => document.getElementById(id);
  let t = (key) => key;
  let locale = 'en';
  let shown = null;
  let seen = null;       // what the app said about the file shown
  let folder = null;     // the Toolbox folder's state

  async function loadTexts() {
    const answer = await window.toolbox.texts();
    const texts = answer.texts;
    locale = answer.locale;
    t = (key, vars) => fmt.fill(Object.prototype.hasOwnProperty.call(texts, key) ? texts[key] : key, vars);
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    document.title = t('drop.title');
    document.documentElement.lang = locale;
    if (shown) show(shown);
    showFolder();
  }

  async function loadFolder() {
    folder = await window.toolbox.folder();
    showFolder();
  }

  /** one line when the Toolbox folder cannot be used; nothing when it can */
  function showFolder() {
    const el = $('folder');
    const f = folder;
    let text = '';
    if (f && f.state === 'other-version') text = t('folder.other-version', { path: f.path, version: f.version || '?', mine: f.mine });
    else if (f && (f.state === 'not-toolbox' || f.state === 'not-a-folder')) text = t('folder.not-toolbox', { path: f.path });
    else if (f && f.state === 'error') text = t('folder.error', { path: f.path });
    el.textContent = text;
    el.hidden = !text;
  }

  function list(names) {
    try {
      return new Intl.ListFormat(locale, { type: 'conjunction' }).format(names);
    } catch {
      return names.join(', ');
    }
  }

  function showSeen() {
    const s = seen;
    $('type').textContent = '';
    $('typenote').textContent = '';
    $('tools').textContent = '';
    if (!s || !shown || shown[0].folder) return;
    if (s.kind === 'no-path') {
      $('type').textContent = t('drop.no-path');
      return;
    }
    if (s.kind !== 'file') {
      $('type').textContent = t('drop.unreadable');
      return;
    }
    if (s.typeName) $('type').textContent = t('drop.type', { type: s.typeName });
    else if (s.ext) $('type').textContent = t('drop.type-unknown', { ext: s.ext });
    else $('type').textContent = t('drop.type-unknown-none');
    if (s.note && s.note.kind === 'content') $('typenote').textContent = t('drop.note-content', { type: s.note.typeName, ext: s.ext || '–' });
    else if (s.note) $('typenote').textContent = t('drop.note-name', { type: s.note.typeName, ext: s.ext });
    if (s.folder && s.folder.state === 'ok') {
      $('tools').textContent = s.tools.length ? t('drop.tools', { tools: list(s.tools.map((x) => x.name)) }) : t('drop.no-tools');
    }
  }

  function show(files) {
    shown = files;
    const first = files[0];
    $('hint').hidden = true;
    $('file').hidden = false;
    if (first.folder) {
      $('name').textContent = t('drop.folder', { name: first.name });
      $('size').textContent = '';
    } else {
      $('name').textContent = first.name;
      $('size').textContent = fmt.formatSize(first.size, t, locale);
    }
    $('more').textContent = files.length > 1 ? t('drop.more', { count: files.length - 1 }) : '';
    showSeen();
  }

  async function take(files) {
    if (!files.length) return;
    seen = null;
    show(files);
    const answer = await window.toolbox.dropped(files);
    if (shown !== files) return;              // another file came meanwhile
    seen = answer;
    if (answer && answer.folder) {
      folder = answer.folder;
      showFolder();
    }
    showSeen();
  }

  function filesOf(dataTransfer) {
    const out = [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    Array.from(dataTransfer.files || []).forEach((file, i) => {
      let isFolder = false;
      const item = items.filter((it) => it.kind === 'file')[i];
      const entry = item && item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry && entry.isDirectory) isFolder = true;
      out.push({ name: file.name, size: file.size, folder: isFolder });
    });
    return out;
  }

  const zone = $('zone');
  const pick = $('pick');
  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    zone.classList.add('over');
  });
  window.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) zone.classList.remove('over');
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('over');
    take(event.dataTransfer ? filesOf(event.dataTransfer) : []);
  });
  zone.addEventListener('click', (event) => {
    if (event.target !== pick) pick.click();
  });
  pick.addEventListener('change', () => {
    take(Array.from(pick.files || []).map((file) => ({ name: file.name, size: file.size, folder: false })));
    pick.value = '';
  });

  window.toolbox.onTextsChanged(loadTexts);
  window.toolbox.onFolderChanged(loadFolder);
  loadTexts();
  loadFolder();
})();
