import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { slugify, timestampForFile } from '../playwright/utils/text.js';
import type { PipelineRunArtifact } from './types.js';

export async function writePipelineArtifact(artifact: PipelineRunArtifact, baseDir = 'artifacts/pipeline-runs'): Promise<string> {
  const resolvedDir = resolve(baseDir);
  await mkdir(resolvedDir, { recursive: true });

  const url = new URL(artifact.input_url);
  const token = slugify(url.hostname + url.pathname);
  const fileName = `${timestampForFile()}_${token}.json`;
  const fullPath = resolve(resolvedDir, fileName);

  await writeFile(fullPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf-8');
  return fullPath;
}
