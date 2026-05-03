export type VideoStatus = 'ready' | 'loading' | 'failed';

export interface VideoFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mtime: number;
  status: VideoStatus;
}

export interface Settings {
  folderPath: string;
  muted: boolean;
  showControls: boolean;
  fullscreen: boolean;
}

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  scanFolder: (path: string) => Promise<VideoFile[]>;
  startWatching: (path: string) => Promise<void>;
  stopWatching: () => Promise<void>;
  onPlaylistUpdated: (callback: (playlist: VideoFile[]) => void) => () => void;
  onFileAdded: (callback: (video: VideoFile) => void) => () => void;
  onFileRemoved: (callback: (video: VideoFile) => void) => () => void;
  onFileFailed: (callback: (video: VideoFile) => void) => () => void;
  onFolderMissing: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
