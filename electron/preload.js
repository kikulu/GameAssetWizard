'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    isElectron: true,
    platform: process.platform,
    request: (options) => ipcRenderer.invoke('api:request', options)
});
