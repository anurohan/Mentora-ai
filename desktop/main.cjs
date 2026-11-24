const { app, BrowserWindow, session } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

let backend;
const port = Number(process.env.MENTORA_PORT || 4173);
const resourceRoot = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const serverPath = path.join(resourceRoot, 'dist', 'server.js');

function startBackend() {
  backend = spawn(process.execPath, [serverPath], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(port), MENTORA_DATA_DIR: path.join(app.getPath('userData'), 'data') }, windowsHide: true, stdio: 'ignore' });
}
async function waitForBackend() { for (let i = 0; i < 100; i += 1) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } } throw new Error('MENTORA backend did not start.'); }
async function createWindow() {
  startBackend(); await waitForBackend();
  const window = new BrowserWindow({ width: 1440, height: 960, minWidth: 960, minHeight: 700, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') } });
  window.once('ready-to-show', () => window.show()); await window.loadURL(`http://127.0.0.1:${port}/`);
}
app.whenReady().then(async () => { session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === 'media')); await createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); }).catch(error => { console.error(error); app.quit(); });
app.on('window-all-closed', () => { if (backend) backend.kill(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (backend) backend.kill(); });
