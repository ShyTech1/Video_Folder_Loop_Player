import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { FolderSelector } from './FolderSelector';
import { PlaylistManager } from './PlaylistManager';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';
import type { Settings, VideoFile } from './types';

const defaultSettings: Settings = {
  folderPath: '',
  muted: true,
  volume: 0.6,
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
  const [statusMessage, setStatusMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [removingVideoPath, setRemovingVideoPath] = useState<string | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  const readyPlaylist = useMemo(() => playlist.filter((video) => video.status !== 'failed'), [playlist]);
  const nextVideo = useMemo(() => {
    if (readyPlaylist.length <= 1) {
      return null;
    }

    const safeIndex = currentIndex >= readyPlaylist.length ? 0 : currentIndex;
    return readyPlaylist[(safeIndex + 1) % readyPlaylist.length];
  }, [readyPlaylist, currentIndex]);

  const currentVideo = useMemo(() => {
    if (removingVideoPath) {
      return null;
    }

    if (readyPlaylist.length === 0) {
      return null;
    }
    if (currentIndex >= readyPlaylist.length) {
      return readyPlaylist[0];
    }
    return readyPlaylist[currentIndex];
  }, [readyPlaylist, currentIndex, removingVideoPath]);

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
    setIsPaused(false);
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
        setIsPaused(false);
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
      setIsPaused(false);
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
    setIsPaused(false);
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

  const setVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    setSettings((current) => ({
      ...current,
      volume: nextVolume,
      muted: nextVolume === 0 ? true : false
    }));
  };

  const toggleFullscreen = async () => {
    const next = { ...settings, fullscreen: !settings.fullscreen };
    setSettings(next);
  };

  const togglePaused = () => {
    if (!currentVideo) {
      return;
    }

    if (isPaused) {
      videoPlayerRef.current?.play();
    } else {
      videoPlayerRef.current?.pause();
    }
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

    setStatusMessage('');
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

    const removingCurrent = currentVideo?.path === videoPath;
    setStatusMessage('');

    let removedVideo: VideoFile | undefined;
    const previousIndex = currentIndex;

    if (removingCurrent) {
      setRemovingVideoPath(videoPath);
      videoPlayerRef.current?.clear();
      setIsPaused(false);
    }

    setPlaylist((current) => {
      removedVideo = current.find((video) => video.path === videoPath);
      const next = current.filter((video) => video.path !== videoPath);
      setSettings((prev) => ({ ...prev, playlistOrder: next.map((video) => video.id) }));
      return next;
    });

    if (removingCurrent) {
      setCurrentIndex(0);
    }

    try {
      await window.electronAPI.removeVideo(settings.folderPath, videoPath);
      setRemovingVideoPath(null);
    } catch (error) {
      setRemovingVideoPath(null);
      if (removedVideo) {
        setPlaylist((current) => {
          const restoreIndex = Math.min(previousIndex, current.length);
          const next = [...current];
          next.splice(restoreIndex, 0, removedVideo as VideoFile);
          setSettings((prev) => ({ ...prev, playlistOrder: next.map((video) => video.id) }));
          return next;
        });
        setCurrentIndex(previousIndex);
      }
      const message = error instanceof Error ? error.message : 'Unable to remove the selected video.';
      setStatusMessage(message);
    }
  };

  return (
    <main className="app">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Wide Screen Activity Loop</p>
          <h1>Keep the school display simple, calm, and easy to manage.</h1>
          <p className="hero-description">
            Add, remove, and reorder videos while the screen keeps playing. The current item stays clear, and the
            queue stays easy to understand from a distance.
          </p>
        </div>
        <div className="hero-stats" aria-label="Playback overview">
          <div className="stat-card">
            <span className="stat-label">Now playing</span>
            <strong>{currentVideo?.name || 'No video selected'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Next up</span>
            <strong>{nextVideo?.name || 'Waiting for more videos'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Queue size</span>
            <strong>{readyPlaylist.length} file{readyPlaylist.length === 1 ? '' : 's'}</strong>
          </div>
        </div>
      </header>

      <FolderSelector folderPath={settings.folderPath} onSelectFolder={handleSelectFolder} />

      <div className="app-shell">
        <section className="player-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Display Preview</p>
              <h2>{currentVideo?.name || 'Ready for the first activity video'}</h2>
              <p className="section-description">
                {nextVideo ? `Next in line: ${nextVideo.name}` : 'Add videos to build the loop.'}
              </p>
            </div>
            <div className="player-status">
              <span className={`status-pill${isPaused ? ' is-paused' : ''}`}>
                {currentVideo ? (isPaused ? 'Paused' : 'Playing') : 'Idle'}
              </span>
            </div>
          </div>

          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          <div className="controls">
            <button type="button" onClick={advanceToNext} disabled={readyPlaylist.length === 0}>
              Next Video
            </button>
            <button type="button" onClick={togglePaused} disabled={!currentVideo}>
              {isPaused ? 'Play' : 'Pause'}
            </button>
            <label className="volume-pill">
              <span>Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.volume}
                onChange={setVolume}
                aria-label="Volume"
              />
            </label>
            <button type="button" className="status-pill status-toggle" onClick={setMuted}>
              Audio ({settings.muted ? 'Off' : 'On'})
            </button>
            <button type="button" onClick={toggleFullscreen}>
              {settings.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
          <VideoPlayer
            ref={videoPlayerRef}
              currentVideo={currentVideo}
              muted={settings.muted}
              volume={settings.volume}
              showControls={settings.showControls}
              fullscreen={settings.fullscreen}
              paused={isPaused}
            onEnded={advanceToNext}
            onError={handleVideoError}
            onPlaybackStateChange={setIsPaused}
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
