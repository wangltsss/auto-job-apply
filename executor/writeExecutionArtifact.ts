import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { slugify, timestampForFile } from '../playwright/utils/text.js';
import type { ExecutionResultArtifact } from './types.js';

export async function writeExecutionArtifact(result: ExecutionResultArtifact, baseDir = 'artifacts/execution-results'): Promise<string> {
  const resolvedDir = resolve(baseDir);
  await mkdir(resolvedDir, { recursive: true });

  const url = new URL(result.application_url);
  const pageToken = slugify(url.hostname + url.pathname);
  const fileName = `${timestampForFile()}_${pageToken}.json`;
  const fullPath = resolve(resolvedDir, fileName);

  await writeFile(fullPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  return fullPath;
}
