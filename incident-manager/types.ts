import type { FailureCategory } from '../run-controller/types.js';

export type IncidentScope = 'site';
export type IncidentStatus = 'active' | 'resolved';

export interface IncidentEventRecord {
  event_id: string;
  detected_at: string;
  site_signature: string;
  host: string;
  failure_category: FailureCategory;
  failure_code: string | null;
  run_id: string;
  job_id: string;
  pipeline_artifact_path: string;
}

export interface IncidentRecord {
  incident_id: string;
  status: IncidentStatus;
  scope: IncidentScope;
  site_signature: string;
  host: string;
  failure_category: FailureCategory;
  failure_code: string | null;
  opened_at: string;
  updated_at: string;
  last_detected_at: string;
  trigger_count: number;
  threshold: number;
  cooldown_until: string;
  reason: string;
}

export interface IncidentManagerStore {
  version: 1;
  updated_at: string;
  events: IncidentEventRecord[];
  incidents: IncidentRecord[];
}

export interface IncidentPolicy {
  repeated_failure_threshold: number;
  repeated_failure_window_ms: number;
  repeated_failure_cooldown_ms: number;
  session_failure_cooldown_ms: number;
}

export interface IncidentFailureInput {
  detected_at: string;
  application_url: string;
  failure_category: FailureCategory;
  failure_code: string | null;
  run_id: string;
  job_id: string;
  pipeline_artifact_path: string;
}
