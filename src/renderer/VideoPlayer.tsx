import { useEffect, useMemo, useRef } from 'react';
import type { VideoFile } from './types';

interface Props {
  currentVideo: VideoFile | null;
  muted: boolean;
  showControls: boolean;
  fullscreen: boolean;
  onEnded: () => void;
  onError: () => void;
}

export function VideoPlayer({ currentVideo, muted, showControls, fullscreen, onEnded, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (fullscreen && videoRef.current) {
      void videoRef.current.requestFullscreen().catch(() => undefined);
    }
  }, [fullscreen]);

  useEffect(() => {
    if (videoRef.current) {
      void videoRef.current.play().catch(() => undefined);
    }
  }, [currentVideo]);

  const videoSrc = useMemo(() => {
    if (!currentVideo) {
      return '';
    }

    const normalized = currentVideo.path.replace(/\\/g, '/');
    const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return encodeURI(`file://${prefixed}`);
  }, [currentVideo]);

  if (!currentVideo) {
    return <div className="empty-state">No videos in selected folder</div>;
  }

  return (
    <video
      ref={videoRef}
      key={currentVideo.id}
      src={videoSrc}
      autoPlay
      muted={muted}
      controls={showControls}
      onEnded={onEnded}
      onError={onError}
      className="video-player"
    />
  );
}
