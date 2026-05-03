import { useEffect, useMemo, useState } from 'react';
import { FolderSelector } from './FolderSelector';
import { usePlaylist } from './usePlaylist';
import { VideoPlayer } from './VideoPlayer';
import type { Settings } from './types';

const defaultSettings: Settings = {
  folderPath: '',
  muted: true,
  showControls: false,
  fullscreen: false
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { playlist, readyPlaylist, setPlaylist, upsertVideo, removeVideo, markFailed } = usePlaylist();

  const currentVideo = useMemo(() => {
    if (readyPlaylist.length === 0) {
      return null;
    }
    if (currentIndex >= readyPlaylist.length) {
      return readyPlaylist[0];
    }
    return readyPlaylist[currentIndex];
  }, [readyPlaylist, currentIndex]);

  const loadFolder = async (folderPath: string) => {
    const scanned = await window.electronAPI.scanFolder(folderPath);
    setPlaylist(scanned);
    setCurrentIndex(0);
    await window.electronAPI.startWatching(folderPath);
  };

  const handleSelectFolder = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) {
      return;
    }

    const nextSettings = { ...settings, folderPath };
    setSettings(nextSettings);
    await window.electronAPI.saveSettings(nextSettings);
    await loadFolder(folderPath);
  };

  useEffect(() => {
    const init = async () => {
      const saved = await window.electronAPI.getSettings();
      setSettings(saved);
      if (saved.folderPath) {
        await loadFolder(saved.folderPath);
      }
    };

    void init();

    return () => {
      void window.electronAPI.stopWatching();
    };
  }, []);

  useEffect(() => {
    const offAdded = window.electronAPI.onFileAdded((video) => {
      upsertVideo(video);
    });

    const offRemoved = window.electronAPI.onFileRemoved((video) => {
      const removedCurrent = currentVideo?.id === video.id;
      removeVideo(video.id);
      if (removedCurrent) {
        setCurrentIndex((index) => {
          if (readyPlaylist.length <= 1) {
            return 0;
          }
          return index % Math.max(readyPlaylist.length - 1, 1);
        });
      }
    });

    const offMissing = window.electronAPI.onFolderMissing(() => {
      setSettings((prev) => ({ ...prev, folderPath: '' }));
      setPlaylist([]);
      setCurrentIndex(0);
    });

    const offFailed = window.electronAPI.onFileFailed((video) => {
      markFailed(video.id);
    });

    return () => {
      offAdded();
      offRemoved();
      offMissing();
      offFailed();
    };
  }, [currentVideo?.id, markFailed, readyPlaylist.length, removeVideo, setPlaylist, upsertVideo]);

  const advanceToNext = () => {
    setCurrentIndex((index) => {
      if (readyPlaylist.length === 0) {
        return 0;
      }
      return (index + 1) % readyPlaylist.length;
    });
  };

  const handleVideoError = () => {
    if (!currentVideo) {
      return;
    }

    markFailed(currentVideo.id);
    advanceToNext();
  };

  const setMuted = async () => {
    const next = { ...settings, muted: !settings.muted };
    setSettings(next);
    await window.electronAPI.saveSettings(next);
  };

  const toggleFullscreen = async () => {
    const next = { ...settings, fullscreen: !settings.fullscreen };
    setSettings(next);
    await window.electronAPI.saveSettings(next);
  };

  return (
    <main className="app">
      <h1>Video Folder Loop Player</h1>
      <FolderSelector folderPath={settings.folderPath} onSelectFolder={handleSelectFolder} />
      <p>Now playing: {currentVideo?.name || 'None'}</p>
      <p>Total videos: {playlist.filter((video) => video.status !== 'failed').length}</p>
      <div className="controls">
        <button type="button" onClick={setMuted}>{settings.muted ? 'Unmute' : 'Mute'}</button>
        <button type="button" onClick={toggleFullscreen}>{settings.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
      </div>
      <VideoPlayer
        currentVideo={currentVideo}
        muted={settings.muted}
        showControls={settings.showControls}
        fullscreen={settings.fullscreen}
        onEnded={advanceToNext}
        onError={handleVideoError}
      />
    </main>
  );
}
