interface Props {
  folderPath: string;
  onSelectFolder: () => Promise<void>;
}

export function FolderSelector({ folderPath, onSelectFolder }: Props) {
  return (
    <div className="folder-selector">
      <div>
        <p className="section-label">Video Folder</p>
        <h2>{folderPath ? 'Your video folder is connected' : 'Choose a folder to get started'}</h2>
        <p className="folder-path">{folderPath || 'No folder selected'}</p>
      </div>
      <button type="button" onClick={onSelectFolder}>
        {folderPath ? 'Change Folder' : 'Select Folder'}
      </button>
    </div>
  );
}
