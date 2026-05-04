import { app, BrowserWindow, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startAutoUpdates } from './autoUpdater';
import { registerIpcHandlers } from './ipcHandlers';

const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const videoProtocolPrefix = 'local-video://file/';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-video',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

function registerVideoProtocol(): void {
  protocol.handle('local-video', (request) => {
    const encodedPath = request.url.slice(videoProtocolPrefix.length);
    const fileUrl = pathToFileURL(decodeURIComponent(encodedPath)).toString();
    return net.fetch(fileUrl, {
      method: request.method,
      headers: request.headers
    });
  });
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (!app.isPackaged) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  registerIpcHandlers(window);
  return window;
}

app.whenReady().then(() => {
  registerVideoProtocol();
  const window = createWindow();
  startAutoUpdates(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createWindow();
      startAutoUpdates(window);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
