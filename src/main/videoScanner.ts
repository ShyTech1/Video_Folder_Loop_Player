import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { VideoFile } from '../renderer/types';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi']);

function isVideoFile(fileName: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export async function toVideoFile(filePath: string): Promise<VideoFile | null> {
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) {
      return null;
    }

    return {
      id: filePath,
      name: path.basename(filePath),
      path: filePath,
      size: metadata.size,
      mtime: metadata.mtimeMs,
      status: 'ready'
    };
  } catch {
    return null;
  }
}

export async function scanFolder(folderPath: string): Promise<VideoFile[]> {
  const entries = await readdir(folderPath);
  const videoNames = entries.filter(isVideoFile);
  const collected = await Promise.all(videoNames.map((name) => toVideoFile(path.join(folderPath, name))));

  return collected
    .filter((entry): entry is VideoFile => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
