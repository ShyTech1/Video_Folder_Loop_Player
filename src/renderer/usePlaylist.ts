import { useCallback, useMemo, useState } from 'react';
import type { VideoFile } from './types';

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<VideoFile[]>([]);

  const upsertVideo = useCallback((video: VideoFile) => {
    setPlaylist((current) => {
      const existing = current.filter((item) => item.id !== video.id);
      const next = [...existing, video];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
  }, []);

  const removeVideo = useCallback((videoId: string) => {
    setPlaylist((current) => current.filter((video) => video.id !== videoId));
  }, []);

  const markFailed = useCallback((videoId: string) => {
    setPlaylist((current) =>
      current.map((video) => (video.id === videoId ? { ...video, status: 'failed' as const } : video))
    );
  }, []);

  const readyPlaylist = useMemo(
    () => playlist.filter((video) => video.status !== 'failed').sort((a, b) => a.name.localeCompare(b.name)),
    [playlist]
  );

  return {
    playlist,
    readyPlaylist,
    setPlaylist,
    upsertVideo,
    removeVideo,
    markFailed
  };
}
