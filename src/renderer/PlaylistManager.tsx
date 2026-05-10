import type { VideoFile } from './types';

function ActionIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="action-icon">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

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
          <p className="section-label">Video Queue</p>
          <h2>Playlist</h2>
          <p>Reorder, skip, or remove videos — the screen keeps playing while you make changes.</p>
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
        <div className="playlist-empty">No videos yet — add some files to start the loop.</div>
      ) : (
        <ul className="playlist-list">
          {playlist.map((video, index) => (
            <li key={video.id} className={`playlist-item${video.id === currentVideoId ? ' is-current' : ''}`}>
              <div className="playlist-meta">
                <span className="playlist-index">{index + 1}</span>
                <div>
                  <strong>{video.name}</strong>
                  <p>{video.id === currentVideoId ? 'Playing now' : index === 0 ? 'Ready next' : 'Queued'}</p>
                </div>
              </div>
              <div className="playlist-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onMoveUp(video.id)}
                  disabled={index === 0}
                  aria-label="Move earlier"
                  title="Move earlier"
                  data-tooltip="Move earlier"
                >
                  <ActionIcon path="M12 6 5 13h4v5h6v-5h4L12 6Z" />
                  <span className="sr-only">Move Earlier</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onMoveDown(video.id)}
                  disabled={index === playlist.length - 1}
                  aria-label="Move later"
                  title="Move later"
                  data-tooltip="Move later"
                >
                  <ActionIcon path="m12 18 7-7h-4V6H9v5H5l7 7Z" />
                  <span className="sr-only">Move Later</span>
                </button>
                <button
                  type="button"
                  className="icon-button danger-button"
                  onClick={() => void onRemove(video.path)}
                  aria-label="Remove"
                  title="Remove"
                  data-tooltip="Remove"
                >
                  <ActionIcon path="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" />
                  <span className="sr-only">Remove</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
