import { contextBridge, ipcRenderer } from 'electron';
import type { Settings, VideoFile } from '../renderer/types';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('selectFolder'),
  selectVideos: (): Promise<string[] | null> => ipcRenderer.invoke('selectVideos'),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('getSettings'),
  saveSettings: (settings: Settings): Promise<void> => ipcRenderer.invoke('saveSettings', settings),
  scanFolder: (path: string): Promise<VideoFile[]> => ipcRenderer.invoke('scanFolder', path),
  addVideosToFolder: (folderPath: string, sourcePaths: string[]): Promise<VideoFile[]> =>
    ipcRenderer.invoke('addVideosToFolder', folderPath, sourcePaths),
  readVideoFile: (path: string): Promise<Uint8Array> => ipcRenderer.invoke('readVideoFile', path),
  removeVideo: (folderPath: string, videoPath: string): Promise<void> =>
    ipcRenderer.invoke('removeVideo', folderPath, videoPath),
  startWatching: (path: string): Promise<void> => ipcRenderer.invoke('startWatching', path),
  stopWatching: (): Promise<void> => ipcRenderer.invoke('stopWatching'),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  onPlaylistUpdated: (callback: (playlist: VideoFile[]) => void) => {
    const channel = 'playlist-updated';
    const handler = (_event: Electron.IpcRendererEvent, playlist: VideoFile[]) => callback(playlist);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onFileAdded: (callback: (video: VideoFile) => void) => {
    const channel = 'file-added';
    const handler = (_event: Electron.IpcRendererEvent, video: VideoFile) => callback(video);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onFileRemoved: (callback: (video: VideoFile) => void) => {
    const channel = 'file-removed';
    const handler = (_event: Electron.IpcRendererEvent, video: VideoFile) => callback(video);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onFileFailed: (callback: (video: VideoFile) => void) => {
    const channel = 'file-failed';
    const handler = (_event: Electron.IpcRendererEvent, video: VideoFile) => callback(video);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onFolderMissing: (callback: () => void) => {
    const channel = 'folder-missing';
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});
