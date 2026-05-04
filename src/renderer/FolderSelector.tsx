interface Props {
  folderPath: string;
  onSelectFolder: () => Promise<void>;
}

export function FolderSelector({ folderPath, onSelectFolder }: Props) {
  return (
    <div className="folder-selector">
      <div>
        <p className="section-label">Content Folder</p>
        <h2>{folderPath ? 'Connected to your video folder' : 'Choose the folder that powers this screen'}</h2>
        <p className="folder-path">{folderPath || 'No folder selected yet.'}</p>
      </div>
      <button type="button" onClick={onSelectFolder}>
        {folderPath ? 'Change Folder' : 'Select Folder'}
      </button>
    </div>
  );
}
