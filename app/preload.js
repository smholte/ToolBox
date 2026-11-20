'use strict';
// The drop window's only door to the app: texts in, dropped files out.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toolbox', {
  texts: () => ipcRenderer.invoke('toolbox:texts'),
  onTextsChanged: (callback) => {
    ipcRenderer.on('toolbox:texts-changed', () => callback());
  },
  dropped: (files) => ipcRenderer.send('toolbox:dropped', files),
});
