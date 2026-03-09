import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import type { AtsType, ExtractedField, ExtractedFormSuccess } from '../playwright/schemas/types.js';

export interface ReasoningPolicyFlags {
  skip_demographic_questions_by_default: boolean;
  do_not_guess_ambiguous_questions: boolean;
  submit_only_if_safe: boolean;
}

export interface ApplicantProfile {
  basics?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  links?: {
    linkedin?: string;
    github?: string;
    website?: string;
  };
  work_preferences?: {
    authorized_locations?: string[];
    requires_sponsorship?: boolean;
    compensation_expectation?: string;
  };
  files?: {
    resume_path?: string;
    cover_letter_path?: string;
  };
  custom?: Record<string, string | number | boolean | null>;
}

export interface ReasoningFieldInput {
  field_id: string;
  label: string;
  type: ExtractedField['type'];
  required: boolean;
  options: string[];
  options_deferred: boolean;
  semantic_category: ExtractedField['semantic_category'];
  sensitivity: ExtractedField['sensitivity'];
  auto_answer_safe: boolean;
  file_kind: ExtractedField['file_kind'];
  help_text: string | null;
  section: string | null;
}

export interface ReasoningInput {
  ats: AtsType;
  application_url: string;
  page_title: string;
  current_step: string | null;
  fields: ReasoningFieldInput[];
  applicant_profile: ApplicantProfile;
  policy_flags: ReasoningPolicyFlags;
}

export interface ReasoningBridgeBuildInput {
  extractedForm: ExtractedFormSuccess;
  applicantProfile: ApplicantProfile;
  policyFlags: ReasoningPolicyFlags;
}

export interface OpenClawRunnerOptions {
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface OpenClawRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type ReasoningBridgeFailureCode =
  | 'missing_extracted_form_artifact'
  | 'invalid_extracted_form_artifact'
  | 'openclaw_invocation_failure'
  | 'malformed_openclaw_json'
  | 'answer_plan_schema_validation_failed';

export interface ReasoningBridgeFailure {
  status: 'error';
  code: ReasoningBridgeFailureCode;
  message: string;
  details: Record<string, unknown>;
}

export interface ReasoningBridgeSuccess {
  status: 'success';
  answerPlan: AnswerPlan;
  answerPlanPath: string;
  prompt: string;
  rawOpenClawOutput: string;
}

export type ReasoningBridgeResult = ReasoningBridgeSuccess | ReasoningBridgeFailure;
