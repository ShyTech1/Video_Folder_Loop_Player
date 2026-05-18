import { app, BrowserWindow, dialog, ipcMain, powerMonitor, shell } from 'electron';
import { autoUpdater } from 'electron-updater';

const initialUpdateCheckDelayMs = 3000;
const periodicUpdateCheckIntervalMs = 15 * 60 * 1000;
const quitAndInstallDelayMs = 2000;

let updateCheckStarted = false;
let updateCheckInProgress = false;
let updateDownloadInProgress = false;
let updateDownloaded = false;
let updatePromptOpen = false;
let installLaunchInProgress = false;
let updateCheckTimer: NodeJS.Timeout | undefined;
let downloadedInstallerPath: string | undefined;

function getDialogWindow(preferredWindow: BrowserWindow): BrowserWindow | undefined {
  if (!preferredWindow.isDestroyed()) {
    return preferredWindow;
  }

  return BrowserWindow.getAllWindows().find((window) => !window.isDestroyed());
}

async function handleInstallerLaunchFailure(window: BrowserWindow, error: unknown): Promise<void> {
  installLaunchInProgress = false;
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Couldn\'t launch update installer automatically:', errorMessage);

  const dialogWindow = getDialogWindow(window);
  const hasInstallerPath = Boolean(downloadedInstallerPath);
  const dialogOptions: Electron.MessageBoxOptions = {
    type: 'warning',
    title: 'Couldn\'t auto-launch installer',
    message: 'The update was downloaded but couldn\'t be launched automatically.',
    detail: hasInstallerPath
      ? `This usually happens when antivirus is scanning the installer. You can open it manually to finish updating.\n\nError: ${errorMessage}`
      : `Try checking for the update again in a moment.\n\nError: ${errorMessage}`,
    buttons: hasInstallerPath ? ['Open installer', 'Cancel'] : ['OK'],
    defaultId: 0,
    cancelId: hasInstallerPath ? 1 : 0
  };

  const { response } = dialogWindow
    ? await dialog.showMessageBox(dialogWindow, dialogOptions)
    : await dialog.showMessageBox(dialogOptions);

  if (hasInstallerPath && response === 0 && downloadedInstallerPath) {
    const openError = await shell.openPath(downloadedInstallerPath);
    if (openError) {
      console.error('shell.openPath failed for installer:', openError);
    }
  }
}

export function startAutoUpdates(window: BrowserWindow): void {
  if (updateCheckStarted) {
    return;
  }

  const isPortableBuild = Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR);

  if (!app.isPackaged || isPortableBuild) {
    ipcMain.handle('checkForUpdates', async () => {
      return { status: 'unavailable', reason: isPortableBuild ? 'portable' : 'dev' };
    });
    return;
  }

  updateCheckStarted = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  const checkForUpdates = (): void => {
    if (updateCheckInProgress || updateDownloadInProgress || updateDownloaded) {
      return;
    }

    updateCheckInProgress = true;

    void autoUpdater
      .checkForUpdates()
      .catch((error) => {
        console.error('Auto-update check failed:', error);
      })
      .finally(() => {
        updateCheckInProgress = false;
      });
  };

  autoUpdater.on('update-available', () => {
    updateDownloadInProgress = true;
  });

  autoUpdater.on('update-not-available', () => {
    updateDownloadInProgress = false;
  });

  autoUpdater.on('error', (error) => {
    updateDownloadInProgress = false;
    console.error('Auto-update failed:', error);

    if (installLaunchInProgress) {
      void handleInstallerLaunchFailure(window, error);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloadInProgress = false;
    updateDownloaded = true;
    downloadedInstallerPath = info?.downloadedFile;

    if (updatePromptOpen) {
      return;
    }

    updatePromptOpen = true;

    const dialogWindow = getDialogWindow(window);
    const dialogOptions: Electron.MessageBoxOptions = {
      type: 'info',
      title: 'Update ready',
      message: 'A new version is ready to install.',
      detail: 'Restart Video Folder Loop Player to finish updating.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1
    };

    const updatePrompt = dialogWindow
      ? dialog.showMessageBox(dialogWindow, dialogOptions)
      : dialog.showMessageBox(dialogOptions);

    void updatePrompt
      .then(({ response }) => {
        if (response === 0) {
          // Small delay gives Windows Defender / AV a chance to release the
          // freshly-downloaded installer before electron-updater tries to spawn it.
          // Without this, an active AV scan causes quitAndInstall to fail with EBUSY.
          installLaunchInProgress = true;
          setTimeout(() => {
            try {
              autoUpdater.quitAndInstall();
            } catch (error) {
              void handleInstallerLaunchFailure(window, error);
            }
          }, quitAndInstallDelayMs);
        }
      })
      .finally(() => {
        updatePromptOpen = false;
      });
  });

  ipcMain.handle('checkForUpdates', async () => {
    if (updateDownloaded) {
      return { status: 'ready' };
    }
    checkForUpdates();
    return { status: 'checking' };
  });

  setTimeout(checkForUpdates, initialUpdateCheckDelayMs);
  updateCheckTimer = setInterval(checkForUpdates, periodicUpdateCheckIntervalMs);
  updateCheckTimer.unref();

  powerMonitor.on('resume', checkForUpdates);

  app.once('before-quit', () => {
    if (updateCheckTimer) {
      clearInterval(updateCheckTimer);
      updateCheckTimer = undefined;
    }

    powerMonitor.off('resume', checkForUpdates);
  });
}
