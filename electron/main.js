'use strict';
const { app, BrowserWindow, ipcMain, net, protocol, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const APP_ORIGIN = 'app://local';

// 以自訂 protocol 提供靜態檔案：fetch('config_sheets/...') 在 file:// 下會被擋，
// 改用 app:// 後行為與網頁版一致，localStorage 也能正常持久化。
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function registerAppProtocol() {
    protocol.handle('app', (request) => {
        const { pathname } = new URL(request.url);
        const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
        const resolved = path.resolve(ROOT, `.${relative}`);
        if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
            return new Response('Forbidden', { status: 403 });
        }
        return net.fetch(pathToFileURL(resolved).toString());
    });
}

// 主程序代送產圖後端請求（Draw Things / SD WebUI / ComfyUI），繞過瀏覽器 CORS。
function registerApiBridge() {
    ipcMain.handle('api:request', async (event, options = {}) => {
        if (!event.senderFrame || !event.senderFrame.url.startsWith(`${APP_ORIGIN}/`)) {
            return { error: 'Blocked: untrusted sender' };
        }
        let target;
        try {
            target = new URL(String(options.url));
        } catch {
            return { error: `無效的網址：${options.url}` };
        }
        if (!['http:', 'https:'].includes(target.protocol)) {
            return { error: '僅支援 http/https 位址' };
        }
        try {
            const method = String(options.method || 'GET').toUpperCase();
            const response = await net.fetch(target.toString(), {
                method,
                headers: options.headers || {},
                body: ['GET', 'HEAD'].includes(method) ? undefined : options.body
            });
            return {
                status: response.status,
                statusText: response.statusText,
                body: await response.text()
            };
        } catch (error) {
            return { error: error.message };
        }
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 960,
        minHeight: 640,
        title: 'Game Asset Prompt Generator',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false
        }
    });

    // 外部連結（Midjourney 等）改用系統瀏覽器開啟，且不允許應用內導向外部網站。
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
    });

    win.loadURL(`${APP_ORIGIN}/index.html`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const [win] = BrowserWindow.getAllWindows();
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.whenReady().then(() => {
        registerAppProtocol();
        registerApiBridge();
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
