import { useEffect, useMemo, useState } from 'react';
import { FolderSelector } from './FolderSelector';
import { PlaylistManager } from './PlaylistManager';
import { VideoPlayer } from './VideoPlayer';
import type { Settings, VideoFile } from './types';

const defaultSettings: Settings = {
  folderPath: '',
  muted: true,
  showControls: false,
  fullscreen: false,
  playlistOrder: []
};

function orderPlaylist(videos: VideoFile[], playlistOrder: string[]): VideoFile[] {
  const videosById = new Map(videos.map((video) => [video.id, video]));
  const ordered = playlistOrder.map((id) => videosById.get(id)).filter((video): video is VideoFile => Boolean(video));
  const remaining = videos
    .filter((video) => !playlistOrder.includes(video.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...ordered, ...remaining];
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState<VideoFile[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const readyPlaylist = useMemo(() => playlist.filter((video) => video.status !== 'failed'), [playlist]);

  const currentVideo = useMemo(() => {
    if (readyPlaylist.length === 0) {
      return null;
    }
    if (currentIndex >= readyPlaylist.length) {
      return readyPlaylist[0];
    }
    return readyPlaylist[currentIndex];
  }, [readyPlaylist, currentIndex]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void window.electronAPI.saveSettings(settings);
  }, [hydrated, settings]);

  const loadFolder = async (folderPath: string, playlistOrder: string[] = settings.playlistOrder) => {
    const scanned = await window.electronAPI.scanFolder(folderPath);
    const ordered = orderPlaylist(scanned, playlistOrder);
    setPlaylist(ordered);
    setSettings((current) => ({ ...current, folderPath, playlistOrder: ordered.map((video) => video.id) }));
    setCurrentIndex(0);
    await window.electronAPI.startWatching(folderPath);
  };

  const handleSelectFolder = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) {
      return;
    }

    const nextSettings = { ...settings, folderPath, playlistOrder: [] };
    setSettings(nextSettings);
    await loadFolder(folderPath, []);
  };

  useEffect(() => {
    const init = async () => {
      const saved = await window.electronAPI.getSettings();
      setSettings(saved);
      if (saved.folderPath) {
        const scanned = await window.electronAPI.scanFolder(saved.folderPath);
        const ordered = orderPlaylist(scanned, saved.playlistOrder);
        setPlaylist(ordered);
        setSettings((current) => ({ ...current, playlistOrder: ordered.map((video) => video.id) }));
        await window.electronAPI.startWatching(saved.folderPath);
      }
      setHydrated(true);
    };

    void init();

    return () => {
      void window.electronAPI.stopWatching();
    };
  }, []);

  useEffect(() => {
    const offAdded = window.electronAPI.onFileAdded((video) => {
      setPlaylist((current) => {
        const withoutExisting = current.filter((item) => item.id !== video.id);
        const next = [...withoutExisting, video];
        const ordered = orderPlaylist(next, settings.playlistOrder);
        setSettings((prev) => {
          if (prev.playlistOrder.includes(video.id)) {
            return prev;
          }
          return { ...prev, playlistOrder: ordered.map((item) => item.id) };
        });
        return ordered;
      });
    });

    const offRemoved = window.electronAPI.onFileRemoved((video) => {
      const removedCurrent = currentVideo?.id === video.id;
      setPlaylist((current) => {
        const next = current.filter((item) => item.id !== video.id);
        setSettings((prev) => ({ ...prev, playlistOrder: next.map((item) => item.id) }));
        return next;
      });
      if (removedCurrent) {
        setCurrentIndex(0);
      }
    });

    const offMissing = window.electronAPI.onFolderMissing(() => {
      setSettings((prev) => ({ ...prev, folderPath: '', playlistOrder: [] }));
      setPlaylist([]);
      setCurrentIndex(0);
    });

    const offFailed = window.electronAPI.onFileFailed((video) => {
      setPlaylist((current) =>
        current.map((item) => (item.id === video.id ? { ...item, status: 'failed' as const } : item))
      );
    });

    return () => {
      offAdded();
      offRemoved();
      offMissing();
      offFailed();
    };
  }, [currentVideo?.id, settings.playlistOrder]);

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

    setPlaylist((current) =>
      current.map((video) => (video.id === currentVideo.id ? { ...video, status: 'failed' as const } : video))
    );
    advanceToNext();
  };

  const setMuted = async () => {
    const next = { ...settings, muted: !settings.muted };
    setSettings(next);
  };

  const toggleFullscreen = async () => {
    const next = { ...settings, fullscreen: !settings.fullscreen };
    setSettings(next);
  };

  const moveVideo = (videoId: string, direction: -1 | 1) => {
    setPlaylist((current) => {
      const index = current.findIndex((video) => video.id === videoId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      setSettings((prev) => ({ ...prev, playlistOrder: next.map((video) => video.id) }));
      return next;
    });
  };

  const handleAddFiles = async () => {
    if (!settings.folderPath) {
      return;
    }

    const sourcePaths = await window.electronAPI.selectVideos();
    if (!sourcePaths || sourcePaths.length === 0) {
      return;
    }

    const addedVideos = await window.electronAPI.addVideosToFolder(settings.folderPath, sourcePaths);
    setPlaylist((current) => {
      const next = [...current];

      for (const video of addedVideos) {
        if (!next.some((item) => item.id === video.id)) {
          next.push(video);
        }
      }

      setSettings((prev) => ({ ...prev, playlistOrder: next.map((video) => video.id) }));
      return next;
    });
  };

  const handleRemoveVideo = async (videoPath: string) => {
    if (!settings.folderPath) {
      return;
    }

    await window.electronAPI.removeVideo(settings.folderPath, videoPath);
    setPlaylist((current) => {
      const next = current.filter((video) => video.path !== videoPath);
      setSettings((prev) => ({ ...prev, playlistOrder: next.map((video) => video.id) }));
      return next;
    });

    if (currentVideo?.path === videoPath) {
      setCurrentIndex(0);
    }
  };

  return (
    <main className="app">
      <h1>Video Folder Loop Player</h1>
      <FolderSelector folderPath={settings.folderPath} onSelectFolder={handleSelectFolder} />
      <div className="app-shell">
        <section className="player-panel">
          <p>Now playing: {currentVideo?.name || 'None'}</p>
          <p>Total videos: {readyPlaylist.length}</p>
          <div className="controls">
            <button type="button" onClick={advanceToNext} disabled={readyPlaylist.length === 0}>Next Video</button>
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
        </section>

        <PlaylistManager
          canManage={Boolean(settings.folderPath)}
          currentVideoId={currentVideo?.id}
          playlist={readyPlaylist}
          onAddFiles={handleAddFiles}
          onMoveUp={(videoId) => moveVideo(videoId, -1)}
          onMoveDown={(videoId) => moveVideo(videoId, 1)}
          onRemove={handleRemoveVideo}
          onSkipNext={advanceToNext}
        />
      </div>
    </main>
  );
}
