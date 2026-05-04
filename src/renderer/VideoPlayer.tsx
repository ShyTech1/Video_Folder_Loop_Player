import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { VideoFile } from './types';

interface Props {
  currentVideo: VideoFile | null;
  muted: boolean;
  volume: number;
  showControls: boolean;
  fullscreen: boolean;
  paused: boolean;
  onEnded: () => void;
  onError: () => void;
  onPlaybackStateChange: (paused: boolean) => void;
}

export interface VideoPlayerHandle {
  pause: () => void;
  play: () => void;
  clear: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { currentVideo, muted, volume, showControls, fullscreen, paused, onEnded, onError, onPlaybackStateChange }: Props,
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    pause: () => {
      videoRef.current?.pause();
    },
    play: () => {
      if (videoRef.current) {
        void videoRef.current.play().catch(() => undefined);
      }
    },
    clear: () => {
      if (!videoRef.current) {
        return;
      }

      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }), []);

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

  useEffect(() => {
    if (!videoRef.current || !currentVideo) {
      return;
    }

    if (paused) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => undefined);
  }, [currentVideo, paused]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.volume = volume;
  }, [volume]);

  const videoSrc = useMemo(() => {
    if (!currentVideo) {
      return '';
    }

    return `local-video://file/${encodeURIComponent(currentVideo.path)}`;
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
      onPlay={() => onPlaybackStateChange(false)}
      onPause={() => onPlaybackStateChange(true)}
      onEnded={onEnded}
      onError={onError}
      className="video-player"
    />
  );
});
