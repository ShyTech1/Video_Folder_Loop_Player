import type { VideoFile } from './types';

interface Props {
  canManage: boolean;
  currentVideoId: string | undefined;
  playlist: VideoFile[];
  onAddFiles: () => Promise<void>;
  onMoveUp: (videoId: string) => void;
  onMoveDown: (videoId: string) => void;
  onRemove: (videoPath: string) => Promise<void>;
  onSkipNext: () => void;
}

export function PlaylistManager({
  canManage,
  currentVideoId,
  playlist,
  onAddFiles,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSkipNext
}: Props) {
  return (
    <section className="playlist-panel">
      <div className="playlist-header">
        <div>
          <h2>Playlist</h2>
          <p>Manage the current folder without leaving the app.</p>
        </div>
        <div className="playlist-actions">
          <button type="button" onClick={onSkipNext} disabled={playlist.length === 0}>
            Next Video
          </button>
          <button type="button" onClick={() => void onAddFiles()} disabled={!canManage}>
            Add Files
          </button>
        </div>
      </div>

      {playlist.length === 0 ? (
        <div className="playlist-empty">No videos loaded yet.</div>
      ) : (
        <ul className="playlist-list">
          {playlist.map((video, index) => (
            <li key={video.id} className={`playlist-item${video.id === currentVideoId ? ' is-current' : ''}`}>
              <div className="playlist-meta">
                <span className="playlist-index">{index + 1}</span>
                <div>
                  <strong>{video.name}</strong>
                  <p>{video.id === currentVideoId ? 'Playing now' : 'Queued'}</p>
                </div>
              </div>
              <div className="playlist-row-actions">
                <button type="button" onClick={() => onMoveUp(video.id)} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={() => onMoveDown(video.id)} disabled={index === playlist.length - 1}>
                  Down
                </button>
                <button type="button" className="danger-button" onClick={() => void onRemove(video.path)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
