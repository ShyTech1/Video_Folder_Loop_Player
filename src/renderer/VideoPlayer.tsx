import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
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

// Stream via the local-video:// protocol registered in main.ts. The <video>
// element issues HTTP range requests so files (including Google Drive
// placeholders) only hydrate the bytes actually played, instead of being
// fully downloaded up front.
function getVideoSrc(filePath: string): string {
  return `local-video://file/${encodeURIComponent(filePath)}`;
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
    // Release the active source synchronously. Called before deleting the
    // currently-playing file so shell.trashItem doesn't race with in-flight
    // range reads.
    clear: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    }
  }), []);

  useEffect(() => {
    void window.electronAPI.setFullScreen(fullscreen);
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

  if (!currentVideo) {
    return <div className="empty-state">No videos in selected folder</div>;
  }

  return (
    <video
      ref={videoRef}
      key={currentVideo.id}
      src={getVideoSrc(currentVideo.path)}
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
