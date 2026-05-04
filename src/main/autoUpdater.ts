import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

let updateCheckStarted = false;

export function startAutoUpdates(window: BrowserWindow): void {
  const isPortableBuild = Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR);

  if (!app.isPackaged || updateCheckStarted || isPortableBuild) {
    return;
  }

  updateCheckStarted = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    console.error('Auto-update failed:', error);
  });

  autoUpdater.on('update-downloaded', () => {
    void dialog
      .showMessageBox(window, {
        type: 'info',
        title: 'Update ready',
        message: 'A new version is ready to install.',
        detail: 'Restart Video Folder Loop Player to finish updating.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
}
