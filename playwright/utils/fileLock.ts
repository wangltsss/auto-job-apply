import { mkdir, open, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function withFileLock<T>(lockPath: string, action: () => Promise<T>, timeoutMs = 5_000): Promise<T> {
  const startedAt = Date.now();

  await mkdir(dirname(lockPath), { recursive: true });

  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.close();

      try {
        return await action();
      } finally {
        await rm(lockPath, { force: true }).catch(() => undefined);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') {
        throw error;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`Timed out waiting for lock: ${lockPath}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
