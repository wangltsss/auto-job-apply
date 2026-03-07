import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ExtractedFormResult } from '../schemas/types.js';
import { slugify, timestampForFile } from './text.js';

export async function writeFormArtifact(result: ExtractedFormResult, baseDir = 'artifacts/forms'): Promise<string> {
  const resolvedDir = resolve(baseDir);
  await mkdir(resolvedDir, { recursive: true });

  const source = 'url' in result ? result.url : result.current_url;
  const urlObj = new URL(source);
  const pageToken = slugify(urlObj.hostname + urlObj.pathname);
  const fileName = `${timestampForFile()}_${pageToken}.json`;
  const fullPath = resolve(resolvedDir, fileName);

  await writeFile(fullPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  return fullPath;
}
