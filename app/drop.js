'use strict';
// The drop window: shows the name and size of what is dropped on it. Every text comes from the language file.
(function () {
  const fmt = window.ToolboxFormat;
  const $ = (id) => document.getElementById(id);
  let t = (key) => key;
  let locale = 'en';
  let shown = null;

  async function loadTexts() {
    const answer = await window.toolbox.texts();
    const texts = answer.texts;
    locale = answer.locale;
    t = (key, vars) => fmt.fill(Object.prototype.hasOwnProperty.call(texts, key) ? texts[key] : key, vars);
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    document.title = t('drop.title');
    document.documentElement.lang = locale;
    if (shown) show(shown);
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
  }

  function filesOf(dataTransfer) {
    const out = [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    Array.from(dataTransfer.files || []).forEach((file, i) => {
      let folder = false;
      const item = items.filter((it) => it.kind === 'file')[i];
      const entry = item && item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry && entry.isDirectory) folder = true;
      out.push({ name: file.name, size: file.size, folder });
    });
    return out;
  }

  const zone = $('zone');
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
    const files = event.dataTransfer ? filesOf(event.dataTransfer) : [];
    if (!files.length) return;
    show(files);
    window.toolbox.dropped(files);
  });

  window.toolbox.onTextsChanged(loadTexts);
  loadTexts();
})();
