import { stat } from 'node:fs/promises';

const WAIT_MS = 1500;
const MAX_ATTEMPTS = 5;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForStableFile(filePath: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const size1 = (await stat(filePath)).size;
      await wait(WAIT_MS);
      const size2 = (await stat(filePath)).size;

      if (size1 === size2) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
