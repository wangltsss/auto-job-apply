import type { PipelineRunArtifact } from '../orchestration/types.js';
import type { FailureCategory, RetryPolicy } from './types.js';

export interface FailureDecision {
  category: FailureCategory;
  retryable: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  max_attempts_per_job: 3,
  retry_delays_ms: [0, 5 * 60_000]
};

const FAILURE_DECISIONS: Record<string, FailureDecision> = {
  scrape_failed: { category: 'site_change', retryable: true },
  missing_extracted_form_artifact: { category: 'data', retryable: false },
  invalid_extracted_form_artifact: { category: 'data', retryable: false },
  openclaw_invocation_failure: { category: 'reasoning', retryable: true },
  malformed_openclaw_json: { category: 'reasoning', retryable: true },
  answer_plan_schema_validation_failed: { category: 'reasoning', retryable: true },
  answer_plan_status_quarantine: { category: 'policy', retryable: false },
  answer_plan_status_not_eligible: { category: 'policy', retryable: false },
  field_not_found: { category: 'site_change', retryable: false },
  locator_resolution_failed: { category: 'transient_ui', retryable: true },
  unsupported_field_type: { category: 'unsupported', retryable: false },
  verification_failed: { category: 'transient_ui', retryable: true },
  upload_failed: { category: 'transient_ui', retryable: true },
  navigation_failed: { category: 'network', retryable: true },
  session_state_invalid: { category: 'session', retryable: false },
  live_field_not_found: { category: 'site_change', retryable: false },
  live_verification_failed: { category: 'transient_ui', retryable: true },
  upload_widget_bind_failed: { category: 'transient_ui', retryable: true },
  submit_blocked_by_policy: { category: 'policy', retryable: false },
  submit_failed: { category: 'network', retryable: true },
  pipeline_unexpected_failure: { category: 'terminal', retryable: false }
};

export function classifyPipelineFailure(artifact: PipelineRunArtifact): FailureDecision {
  if (!artifact.failure_code) {
    return { category: 'terminal', retryable: false };
  }

  return FAILURE_DECISIONS[artifact.failure_code] ?? { category: 'terminal', retryable: false };
}

export function buildRetryPolicy(policy?: Partial<RetryPolicy>): RetryPolicy {
  return {
    max_attempts_per_job: policy?.max_attempts_per_job ?? DEFAULT_RETRY_POLICY.max_attempts_per_job,
    retry_delays_ms: policy?.retry_delays_ms ?? DEFAULT_RETRY_POLICY.retry_delays_ms
  };
}

export function computeNextAttemptAt(attemptNumber: number, retryPolicy: RetryPolicy, currentTime: string): string | null {
  if (attemptNumber >= retryPolicy.max_attempts_per_job) {
    return null;
  }

  const delayMs = retryPolicy.retry_delays_ms[Math.max(0, attemptNumber - 1)] ?? 0;
  return new Date(new Date(currentTime).getTime() + delayMs).toISOString();
}
