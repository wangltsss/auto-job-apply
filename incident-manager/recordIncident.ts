import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { loadIncidentStore, writeIncidentStore } from './store.js';
import type { IncidentFailureInput, IncidentPolicy, IncidentRecord } from './types.js';

export const DEFAULT_INCIDENT_POLICY: IncidentPolicy = {
  repeated_failure_threshold: 3,
  repeated_failure_window_ms: 30 * 60_000,
  repeated_failure_cooldown_ms: 30 * 60_000,
  session_failure_cooldown_ms: 30 * 60_000
};

function extractHost(applicationUrl: string): string {
  return new URL(applicationUrl).hostname.toLowerCase();
}

function buildSiteSignature(host: string, failureCategory: string, failureCode: string | null): string {
  return `${host}|${failureCategory}|${failureCode ?? 'unknown'}`;
}

function pruneExpiredIncidents(incidents: IncidentRecord[], currentTime: string): void {
  for (const incident of incidents) {
    if (incident.status === 'active' && incident.cooldown_until <= currentTime) {
      incident.status = 'resolved';
      incident.updated_at = currentTime;
    }
  }
}

export async function recordFailureIncident(
  input: IncidentFailureInput,
  policy: Partial<IncidentPolicy> = {},
  storePath?: string
): Promise<{ storePath: string; openedIncident: IncidentRecord | null }> {
  const resolvedPolicy: IncidentPolicy = { ...DEFAULT_INCIDENT_POLICY, ...policy };
  const store = await loadIncidentStore(storePath);
  const host = extractHost(input.application_url);
  const siteSignature = buildSiteSignature(host, input.failure_category, input.failure_code);
  const detectedAtMs = new Date(input.detected_at).getTime();
  const windowStartMs = detectedAtMs - resolvedPolicy.repeated_failure_window_ms;

  store.events = store.events.filter((event) => new Date(event.detected_at).getTime() >= windowStartMs);
  pruneExpiredIncidents(store.incidents, input.detected_at);

  const event = {
    event_id: randomUUID(),
    detected_at: input.detected_at,
    site_signature: siteSignature,
    host,
    failure_category: input.failure_category,
    failure_code: input.failure_code,
    run_id: input.run_id,
    job_id: input.job_id,
    pipeline_artifact_path: input.pipeline_artifact_path
  };
  store.events.push(event);

  const matchingEvents = store.events.filter((candidate) => candidate.site_signature === siteSignature);
  const threshold = input.failure_category === 'session' ? 1 : resolvedPolicy.repeated_failure_threshold;
  if (matchingEvents.length < threshold) {
    const writtenPath = await writeIncidentStore(store, storePath);
    return { storePath: writtenPath, openedIncident: null };
  }

  const cooldownMs =
    input.failure_category === 'session'
      ? resolvedPolicy.session_failure_cooldown_ms
      : resolvedPolicy.repeated_failure_cooldown_ms;
  const cooldownUntil = new Date(detectedAtMs + cooldownMs).toISOString();
  const existing = store.incidents.find((incident) => incident.site_signature === siteSignature && incident.status === 'active');

  if (existing) {
    existing.updated_at = input.detected_at;
    existing.last_detected_at = input.detected_at;
    existing.trigger_count = matchingEvents.length;
    existing.cooldown_until = cooldownUntil;
    const writtenPath = await writeIncidentStore(store, storePath);
    return { storePath: writtenPath, openedIncident: existing };
  }

  const openedIncident: IncidentRecord = {
    incident_id: randomUUID(),
    status: 'active',
    scope: 'site',
    site_signature: siteSignature,
    host,
    failure_category: input.failure_category,
    failure_code: input.failure_code,
    opened_at: input.detected_at,
    updated_at: input.detected_at,
    last_detected_at: input.detected_at,
    trigger_count: matchingEvents.length,
    threshold,
    cooldown_until: cooldownUntil,
    reason:
      input.failure_category === 'session'
        ? 'Session failure triggered immediate host cooldown.'
        : 'Repeated failure threshold reached for site signature.'
  };

  store.incidents.push(openedIncident);
  const writtenPath = await writeIncidentStore(store, storePath);
  return { storePath: writtenPath, openedIncident };
}

export async function listIncidents(
  options: { status?: 'active' | 'resolved'; limit?: number } = {},
  storePath?: string
): Promise<IncidentRecord[]> {
  const store = await loadIncidentStore(storePath);
  const currentTime = new Date().toISOString();
  pruneExpiredIncidents(store.incidents, currentTime);
  await writeIncidentStore(store, storePath);

  return store.incidents
    .filter((incident) => (options.status ? incident.status === options.status : true))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, options.limit ?? store.incidents.length);
}

export async function getActiveIncidents(storePath?: string): Promise<IncidentRecord[]> {
  return listIncidents({ status: 'active' }, storePath);
}

export async function getActiveIncidentHosts(storePath?: string): Promise<string[]> {
  const incidents = await getActiveIncidents(storePath);
  return [...new Set(incidents.map((incident) => incident.host))];
}
