import { dialog, ipcMain } from 'electron';
import { access, copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { FolderWatcher } from './folderWatcher';
import { getSettings, saveSettings } from './settingsStore';
import { scanFolder, toVideoFile } from './videoScanner';
import type { BrowserWindow } from 'electron';
import type { Settings } from '../renderer/types';

const watcher = new FolderWatcher();
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi'];

function sanitizeSettings(input: Settings): Settings {
  return {
    folderPath: typeof input.folderPath === 'string' ? input.folderPath : '',
    muted: Boolean(input.muted),
    showControls: Boolean(input.showControls),
    fullscreen: Boolean(input.fullscreen),
    playlistOrder: Array.isArray(input.playlistOrder)
      ? input.playlistOrder.filter((item): item is string => typeof item === 'string')
      : []
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

async function createUniqueDestinationPath(folderPath: string, fileName: string): Promise<string> {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  let attempt = 0;

  while (true) {
    const candidateName = attempt === 0 ? fileName : `${baseName} (${attempt})${extension}`;
    const candidatePath = path.join(folderPath, candidateName);

    try {
      await access(candidatePath);
      attempt += 1;
    } catch {
      return candidatePath;
    }
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

  ipcMain.handle('selectVideos', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Video Files',
          extensions: VIDEO_EXTENSIONS
        }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths;
  });

  ipcMain.handle('getSettings', async () => {
    const settings = getSettings();
    if (settings.folderPath && !(await folderExists(settings.folderPath))) {
      window.webContents.send('folder-missing');
      return { ...settings, folderPath: '', playlistOrder: [] };
    }
    return settings;
  });

  ipcMain.handle('saveSettings', async (_event, settings: Settings) => {
    saveSettings(sanitizeSettings(settings));
  });

  ipcMain.handle('scanFolder', async (_event, folderPath: string) => scanFolder(folderPath));

  ipcMain.handle('addVideosToFolder', async (_event, folderPath: string, sourcePaths: string[]) => {
    const added = await Promise.all(
      sourcePaths.map(async (sourcePath) => {
        const sourceName = path.basename(sourcePath);
        const destinationPath =
          path.resolve(path.dirname(sourcePath)) === path.resolve(folderPath)
            ? sourcePath
            : await createUniqueDestinationPath(folderPath, sourceName);

        if (destinationPath !== sourcePath) {
          await copyFile(sourcePath, destinationPath);
        }

        return toVideoFile(destinationPath);
      })
    );

    return added.filter((video): video is NonNullable<typeof video> => video !== null);
  });

  ipcMain.handle('removeVideo', async (_event, folderPath: string, videoPath: string) => {
    const resolvedFolder = path.resolve(folderPath);
    const resolvedVideo = path.resolve(videoPath);

    if (path.dirname(resolvedVideo) !== resolvedFolder) {
      throw new Error('Cannot remove files outside the selected folder.');
    }

    await unlink(resolvedVideo);
  });

  ipcMain.handle('startWatching', async (_event, folderPath: string) => {
    await watcher.start(folderPath, window);
  });

  ipcMain.handle('stopWatching', async () => {
    await watcher.stop();
  });
}
