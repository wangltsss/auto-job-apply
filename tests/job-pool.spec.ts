import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ingestJobs } from '../job-pool/ingestJobs.js';
import { listJobs } from '../job-pool/listJobs.js';
import { normalizeJobPosting } from '../job-pool/normalizeJobPosting.js';
import { loadJobPoolStore } from '../job-pool/store.js';

test('normalizeJobPosting strips fragments and tracking params', () => {
  const normalized = normalizeJobPosting({
    source_url: 'https://jobs.example.test/apply/123?utm_source=x&gh_src=y&keep=1#section',
    company: ' Example Co ',
    title: ' Software Engineer '
  });

  expect(normalized.source_url).toBe('https://jobs.example.test/apply/123?keep=1');
  expect(normalized.canonical_job_url).toBe('https://jobs.example.test/apply/123?keep=1');
  expect(normalized.company).toBe('Example Co');
  expect(normalized.title).toBe('Software Engineer');
  expect(normalized.status).toBe('queued');
});

test('ingestJobs stores new jobs and deduplicates canonical matches', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'job-pool-store-'));
  const storePath = join(tempDir, 'jobs.json');

  try {
    const first = await ingestJobs(
      [
        {
          source_url: 'https://jobs.example.test/apply/123?utm_source=x',
          company: 'Example Co',
          title: 'Engineer'
        }
      ],
      storePath
    );

    expect(first.results).toHaveLength(1);
    expect(first.results[0]?.inserted).toBeTruthy();
    expect(first.results[0]?.duplicate).toBeFalsy();

    const second = await ingestJobs(
      [
        {
          source_url: 'https://jobs.example.test/apply/123#top',
          company: 'Example Co',
          title: 'Engineer'
        }
      ],
      storePath
    );

    expect(second.results).toHaveLength(1);
    expect(second.results[0]?.inserted).toBeFalsy();
    expect(second.results[0]?.duplicate).toBeTruthy();

    const store = await loadJobPoolStore(storePath);
    expect(store.jobs).toHaveLength(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('listJobs filters and persists records', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'job-pool-list-'));
  const storePath = join(tempDir, 'jobs.json');

  try {
    await ingestJobs(
      [
        {
          source_type: 'manual',
          source_url: 'https://jobs.example.test/apply/123',
          title: 'Engineer'
        },
        {
          source_type: 'automated',
          source_url: 'https://jobs.example.test/apply/456',
          title: 'Designer'
        }
      ],
      storePath
    );

    const manualJobs = await listJobs({ source_type: 'manual' }, storePath);
    const allJobs = await listJobs({}, storePath);
    const raw = JSON.parse(await readFile(storePath, 'utf-8')) as { jobs: unknown[] };

    expect(manualJobs).toHaveLength(1);
    expect(allJobs).toHaveLength(2);
    expect(raw.jobs).toHaveLength(2);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
