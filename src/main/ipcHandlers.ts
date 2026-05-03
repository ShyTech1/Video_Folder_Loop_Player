import { dialog, ipcMain } from 'electron';
import { access } from 'node:fs/promises';
import { FolderWatcher } from './folderWatcher';
import { getSettings, saveSettings } from './settingsStore';
import { scanFolder } from './videoScanner';
import type { BrowserWindow } from 'electron';
import type { Settings } from '../renderer/types';

const watcher = new FolderWatcher();

function sanitizeSettings(input: Settings): Settings {
  return {
    folderPath: typeof input.folderPath === 'string' ? input.folderPath : '',
    muted: Boolean(input.muted),
    showControls: Boolean(input.showControls),
    fullscreen: Boolean(input.fullscreen)
  };
}

async function folderExists(folderPath: string): Promise<boolean> {
  try {
    await access(folderPath);
    return true;
  } catch {
    return false;
  }
}

export function registerIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('selectFolder', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('getSettings', async () => {
    const settings = getSettings();
    if (settings.folderPath && !(await folderExists(settings.folderPath))) {
      window.webContents.send('folder-missing');
      return { ...settings, folderPath: '' };
    }
    return settings;
  });

  ipcMain.handle('saveSettings', async (_event, settings: Settings) => {
    saveSettings(sanitizeSettings(settings));
  });

  ipcMain.handle('scanFolder', async (_event, folderPath: string) => scanFolder(folderPath));

  ipcMain.handle('startWatching', async (_event, folderPath: string) => {
    await watcher.start(folderPath, window);
  });

  ipcMain.handle('stopWatching', async () => {
    await watcher.stop();
  });
}
