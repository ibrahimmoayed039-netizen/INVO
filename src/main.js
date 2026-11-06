const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    serverUrl: '',
    lastModule: 'pos',
    fullscreen: false,
    silentPrint: false,
    printerName: '',
    bounds: { width: 1366, height: 820 }
  }
});

// Routes served by the Frappe backend (see ury/hooks.py website_route_rules)
const MODULES = {
  pos:     { label: 'نقطة البيع (POS)',        path: '/pos' },
  admin:   { label: 'لوحة الإدارة',            path: '/ury' },
  kitchen: { label: 'شاشة المطبخ (Mosaic)',    path: '/mosaic' },
  order:   { label: 'الطلب الذاتي (Kiosk)',    path: '/order' },
  desk:    { label: 'Frappe Desk',             path: '/app' },
  legacy:  { label: 'POS القديم (v1)',         path: '/urypos' }
};

let win;

function normalizeUrl(u) {
  u = (u || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
}

function loadModule(key) {
  const server = normalizeUrl(store.get('serverUrl'));
  if (!server) return win.loadFile(path.join(__dirname, 'setup.html'));
  const mod = MODULES[key] || MODULES.pos;
  store.set('lastModule', key);
  win.loadURL(server + mod.path).catch(() => {});
}

function createWindow() {
  const b = store.get('bounds');
  win = new BrowserWindow({
    width: b.width, height: b.height, x: b.x, y: b.y,
    fullscreen: store.get('fullscreen'),
    backgroundColor: '#ffffff',
    title: 'URY Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.on('close', () => {
    if (!win.isFullScreen() && !win.isMaximized()) store.set('bounds', win.getBounds());
  });

  // Offline / server unreachable -> friendly page with retry
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    win.loadFile(path.join(__dirname, 'offline.html'), { query: { url, error: desc } });
  });

  // External links open in the system browser, same-server links stay inside
  win.webContents.setWindowOpenHandler(({ url }) => {
    const server = normalizeUrl(store.get('serverUrl'));
    if (server && url.startsWith(server)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  loadModule(store.get('lastModule'));
}

function buildMenu() {
  const modules = Object.entries(MODULES).map(([key, m]) => ({
    label: m.label, click: () => loadModule(key)
  }));
  const template = [
    { label: 'البرنامج', submenu: [
      ...modules,
      { type: 'separator' },
      { label: 'تغيير عنوان الخادم', click: () => win.loadFile(path.join(__dirname, 'setup.html')) },
      { label: 'ملء الشاشة', accelerator: 'F11', click: () => {
          const fs = !win.isFullScreen(); win.setFullScreen(fs); store.set('fullscreen', fs); } },
      { label: 'إعادة تحميل', accelerator: 'CmdOrCtrl+R', click: () => win.webContents.reload() },
      { label: 'مسح الذاكرة المؤقتة', click: async () => {
          await session.defaultSession.clearCache(); win.webContents.reload(); } },
      { type: 'separator' },
      { role: 'quit', label: 'خروج' }
    ]},
    { label: 'الطباعة', submenu: [
      { label: 'طباعة صامتة (بدون نافذة)', type: 'checkbox', checked: store.get('silentPrint'),
        click: (i) => store.set('silentPrint', i.checked) },
      { label: 'اختيار الطابعة الافتراضية...', click: chooseDefaultPrinter }
    ]},
    { label: 'عرض', submenu: [
      { role: 'zoomIn', label: 'تكبير' }, { role: 'zoomOut', label: 'تصغير' },
      { role: 'resetZoom', label: 'الحجم الافتراضي' },
      { role: 'toggleDevTools', label: 'أدوات المطور' }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function chooseDefaultPrinter() {
  const printers = await win.webContents.getPrintersAsync();
  if (!printers.length) return dialog.showMessageBox(win, { message: 'لا توجد طابعات معرّفة' });
  const { response } = await dialog.showMessageBox(win, {
    message: 'اختر الطابعة', buttons: printers.map(p => p.name).concat('إلغاء'), cancelId: printers.length
  });
  if (response < printers.length) store.set('printerName', printers[response].name);
}

// ---------- IPC ----------
ipcMain.handle('config:get', () => ({
  serverUrl: store.get('serverUrl'),
  silentPrint: store.get('silentPrint'),
  printerName: store.get('printerName')
}));

ipcMain.handle('config:setServer', async (_e, url) => {
  const u = normalizeUrl(url);
  if (!u) return { ok: false, error: 'العنوان فارغ' };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(u + '/api/method/ping', { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch (err) {
    return { ok: false, error: 'تعذر الاتصال بالخادم: ' + err.message };
  }
  store.set('serverUrl', u);
  loadModule(store.get('lastModule'));
  return { ok: true };
});

ipcMain.handle('app:retry', () => loadModule(store.get('lastModule')));
ipcMain.handle('app:openModule', (_e, key) => loadModule(key));
ipcMain.handle('printers:list', () => win.webContents.getPrintersAsync());

// Silent HTML printing (replacement for QZ Tray) – used by the preload bridge
ipcMain.handle('print:html', async (_e, html, opts = {}) => {
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await pw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const deviceName = opts.printer || store.get('printerName') || undefined;
  const silent = opts.silent ?? store.get('silentPrint');
  return new Promise((resolve) => {
    pw.webContents.print({ silent, printBackground: true, deviceName }, (ok, reason) => {
      pw.destroy(); resolve({ ok, reason });
    });
  });
});

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { createWindow(); buildMenu(); });
  app.on('window-all-closed', () => app.quit());
}
