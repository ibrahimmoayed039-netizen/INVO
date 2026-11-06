const { contextBridge, ipcRenderer } = require('electron');

// Exposed to the web pages (POS / Admin / Mosaic) as window.uryDesktop
contextBridge.exposeInMainWorld('uryDesktop', {
  isDesktop: true,
  getConfig: () => ipcRenderer.invoke('config:get'),
  setServer: (url) => ipcRenderer.invoke('config:setServer', url),
  retry: () => ipcRenderer.invoke('app:retry'),
  openModule: (key) => ipcRenderer.invoke('app:openModule', key),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  printHtml: (html, opts) => ipcRenderer.invoke('print:html', html, opts)
});
