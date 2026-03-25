import type { AnswerType } from '../playwright/schemas/answerPlanTypes.js';
import type { AtsType } from '../playwright/schemas/types.js';
import type { ExecutionFailureCode } from '../executor/types.js';

export type AnswerProvenance = 'known_profile' | 'clawdbot_inferred' | 'user_clarification_required';

export interface AnswerSummaryRecord {
  field_id: string;
  answer_type: AnswerType;
  confidence: number;
  rationale_short: string;
  requires_human_review: boolean;
  provenance: AnswerProvenance;
}

export interface ApplicationAttemptRecord {
  attempt_id: string;
  job_id: string | null;
  application_url: string;
  ats: AtsType;
  started_at: string;
  ended_at: string;
  outcome: 'success' | 'failure';
  failure_code: ExecutionFailureCode | null;
  submit_attempted: boolean;
  submit_succeeded: boolean;
  extracted_form_path: string;
  answer_plan_path: string;
  execution_artifact_path: string;
  notes: string[];
  answer_summary: AnswerSummaryRecord[];
}

export interface ApplicationSuccessRecord {
  application_id: string;
  attempt_id: string;
  job_id: string | null;
  applied_at: string;
  application_url: string;
  ats: AtsType;
  extracted_form_path: string;
  answer_plan_path: string;
  execution_artifact_path: string;
  submitted_answers_summary: AnswerSummaryRecord[];
}

export interface FailureRecord {
  failure_id: string;
  attempt_id: string;
  job_id: string | null;
  detected_at: string;
  application_url: string;
  ats: AtsType;
  failure_code: ExecutionFailureCode | null;
  message: string;
  details: {
    extracted_form_path: string;
    answer_plan_path: string;
    execution_artifact_path: string;
    submit_attempted: boolean;
    submit_succeeded: boolean;
    notes: string[];
  };
}

export interface ClarificationItemRecord {
  clarification_id: string;
  attempt_id: string;
  job_id: string | null;
  application_url: string;
  ats: AtsType;
  detected_at: string;
  field_id: string;
  question_label: string | null;
  answer_type: AnswerType;
  provenance: 'user_clarification_required';
  confidence: number;
  rationale_short: string;
  resolved: boolean;
}

export interface ApplicationLedgerStore {
  version: 1;
  updated_at: string;
  attempts: ApplicationAttemptRecord[];
  successes: ApplicationSuccessRecord[];
  failures: FailureRecord[];
  clarifications: ClarificationItemRecord[];
}
