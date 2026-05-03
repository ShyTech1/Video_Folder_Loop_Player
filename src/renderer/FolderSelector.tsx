interface Props {
  folderPath: string;
  onSelectFolder: () => Promise<void>;
}

export function FolderSelector({ folderPath, onSelectFolder }: Props) {
  return (
    <div className="folder-selector">
      <button type="button" onClick={onSelectFolder}>Select Folder</button>
      <p>Current folder: {folderPath || 'Not selected'}</p>
    </div>
  );
}
