import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import { slugify, timestampForFile } from '../playwright/utils/text.js';

export async function writeAnswerPlanArtifact(plan: AnswerPlan, baseDir = 'artifacts/answer-plans'): Promise<string> {
  const resolvedDir = resolve(baseDir);
  await mkdir(resolvedDir, { recursive: true });

  const url = new URL(plan.application_url);
  const pageToken = slugify(url.hostname + url.pathname);
  const fileName = `${timestampForFile()}_${pageToken}.json`;
  const fullPath = resolve(resolvedDir, fileName);

  await writeFile(fullPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf-8');
  return fullPath;
}
