import { createHash } from 'node:crypto';
import { cleanText, nowIso, nullIfEmpty } from '../playwright/utils/text.js';
import type { IngestJobInput, JobPostingRecord } from './types.js';

const TRACKING_QUERY_PARAMS = new Set(['gh_src', 'utm_campaign', 'utm_content', 'utm_medium', 'utm_source', 'utm_term']);

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  const sorted = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) => {
    if (aKey === bKey) {
      return aValue.localeCompare(bValue);
    }
    return aKey.localeCompare(bKey);
  });
  url.search = '';

  for (const [key, value] of sorted) {
    if (TRACKING_QUERY_PARAMS.has(key) || key.startsWith('utm_')) {
      continue;
    }
    url.searchParams.append(key, value);
  }

  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }

  return url.toString();
}

function buildJobId(dedupeKey: string): string {
  return createHash('sha1').update(dedupeKey).digest('hex').slice(0, 16);
}

function buildDedupeKey(canonicalJobUrl: string, applyUrl: string, company: string | null, title: string | null, location: string | null): string {
  const fingerprint = JSON.stringify({
    canonical_job_url: canonicalJobUrl,
    apply_url: applyUrl,
    company,
    title,
    location
  });

  return createHash('sha1').update(fingerprint).digest('hex');
}

export function normalizeJobPosting(input: IngestJobInput): JobPostingRecord {
  const discoveredAt = nowIso();
  const sourceUrl = normalizeUrl(input.source_url);
  const applyUrl = normalizeUrl(input.apply_url ?? input.source_url);
  const canonicalJobUrl = sourceUrl;
  const company = nullIfEmpty(input.company);
  const title = nullIfEmpty(input.title);
  const location = nullIfEmpty(input.location);
  const employmentType = nullIfEmpty(input.employment_type);
  const notes = nullIfEmpty(input.notes);
  const postedAt = nullIfEmpty(input.posted_at);
  const dedupeKey = buildDedupeKey(canonicalJobUrl, applyUrl, company, title, location);

  return {
    job_id: buildJobId(dedupeKey),
    source_type: input.source_type ?? 'manual',
    source_url: sourceUrl,
    canonical_job_url: canonicalJobUrl,
    apply_url: applyUrl,
    company,
    title,
    location,
    employment_type: employmentType,
    posted_at: postedAt,
    discovered_at: discoveredAt,
    status: 'queued',
    dedupe_key: dedupeKey,
    notes,
    raw_payload: input.raw_payload ?? {
      source_url: cleanText(input.source_url)
    }
  };
}
