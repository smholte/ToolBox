'use strict';
// The drop window's only door to the app: texts in, dropped files out, what they are back.
// Where a dropped or chosen file lies is known only here (webUtils): it is taken from the same drop or choice the
// page sees, before the page's own handler runs, and sent along with the names the page passes.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

let paths = [];
function capture(list) {
  paths = Array.from(list || []).map((file) => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  });
}
window.addEventListener('drop', (event) => capture(event.dataTransfer && event.dataTransfer.files), true);
window.addEventListener('change', (event) => {
  if (event.target && event.target.files) capture(event.target.files);
}, true);

contextBridge.exposeInMainWorld('toolbox', {
  texts: () => ipcRenderer.invoke('toolbox:texts'),
  folder: () => ipcRenderer.invoke('toolbox:folder'),
  onTextsChanged: (callback) => {
    ipcRenderer.on('toolbox:texts-changed', () => callback());
  },
  onFolderChanged: (callback) => {
    ipcRenderer.on('toolbox:folder-changed', () => callback());
  },
  dropped: (files) => ipcRenderer.invoke('toolbox:dropped', files.map((f, i) => ({
    name: f.name, size: f.size, folder: f.folder, path: paths[i] || '',
  }))),
});
