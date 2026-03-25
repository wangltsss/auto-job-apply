import type { AnswerPlan, AnswerPlanItem } from '../playwright/schemas/answerPlanTypes.js';
import type { AtsType, ExtractedField, ExtractedFormSuccess } from '../playwright/schemas/types.js';

export type ExecutionFailureCode =
  | 'field_not_found'
  | 'locator_resolution_failed'
  | 'unsupported_field_type'
  | 'verification_failed'
  | 'upload_failed'
  | 'navigation_failed'
  | 'session_state_invalid'
  | 'live_field_not_found'
  | 'live_verification_failed'
  | 'upload_widget_bind_failed'
  | 'submit_blocked_by_policy'
  | 'submit_failed';

export interface ExecutionActionResult {
  field_id: string;
  answer_type: AnswerPlanItem['answer_type'];
  status: 'applied' | 'skipped' | 'failed';
  message: string;
}

export interface ExecutionFailedField {
  field_id: string;
  code: ExecutionFailureCode;
  message: string;
}

export interface ExecutionResultArtifact {
  status: 'success' | 'error';
  application_url: string;
  ats: AtsType;
  extracted_form_path: string;
  answer_plan_path: string;
  current_url: string | null;
  headless: boolean;
  storage_state_path: string | null;
  started_at: string;
  ended_at: string;
  applied_actions: ExecutionActionResult[];
  skipped_fields: string[];
  failed_fields: ExecutionFailedField[];
  screenshots: string[];
  trace_path: string | null;
  submit_attempted: boolean;
  submit_succeeded: boolean;
  failure_code: ExecutionFailureCode | null;
  notes: string[];
}

export interface ExecutionInputs {
  extractedForm: ExtractedFormSuccess;
  answerPlan: AnswerPlan;
  extractedFormPath: string;
  answerPlanPath: string;
  fieldsById: Map<string, ExtractedField>;
}

export interface ExecutorOptions {
  jobId?: string;
  dryRun?: boolean;
  attemptSubmit?: boolean;
  mockMode?: boolean;
  headless?: boolean;
  timeoutMs?: number;
  storageStatePath?: string;
  cdpEndpoint?: string;
  traceEnabled?: boolean;
  ledgerStorePath?: string;
}

export interface LocatorResolution {
  strategy: string;
  selector: string;
}
