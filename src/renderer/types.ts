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
  volume: number;
  showControls: boolean;
  fullscreen: boolean;
  playlistOrder: string[];
}

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  selectVideos: () => Promise<string[] | null>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  scanFolder: (path: string) => Promise<VideoFile[]>;
  addVideosToFolder: (folderPath: string, sourcePaths: string[]) => Promise<VideoFile[]>;
  readVideoFile: (path: string) => Promise<Uint8Array>;
  removeVideo: (folderPath: string, videoPath: string) => Promise<void>;
  startWatching: (path: string) => Promise<void>;
  stopWatching: () => Promise<void>;
  checkForUpdates: () => Promise<{ status: 'checking' | 'ready' | 'unavailable'; reason?: string }>;
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
