import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { waitForStableFile } from './fileStability';
import { toVideoFile } from './videoScanner';
import type { BrowserWindow } from 'electron';
import type { VideoFile } from '../renderer/types';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);

function isVideo(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export class FolderWatcher {
  private watcher: FSWatcher | null = null;

  public async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  public async start(folderPath: string, window: BrowserWindow): Promise<void> {
    await this.stop();

    this.watcher = chokidar.watch(folderPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: false
    });

    this.watcher.on('add', async (filePath) => {
      if (!isVideo(filePath)) {
        return;
      }

      const stable = await waitForStableFile(filePath);
      if (!stable) {
        return;
      }

      const video = await toVideoFile(filePath);
      if (video) {
        window.webContents.send('file-added', video);
      }
    });

    this.watcher.on('unlink', (filePath) => {
      if (!isVideo(filePath)) {
        return;
      }

      const removed: VideoFile = {
        id: filePath,
        name: path.basename(filePath),
        path: filePath,
        size: 0,
        mtime: Date.now(),
        status: 'ready'
      };
      window.webContents.send('file-removed', removed);
    });
  }
}
