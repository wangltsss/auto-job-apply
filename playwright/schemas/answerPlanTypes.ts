import type { AtsType } from './types.js';

export type AnswerPlanStatus = 'proceed' | 'quarantine' | 'not_eligible';

export type AnswerType = 'scalar' | 'option' | 'multi_select' | 'file_action' | 'skip';
export type AnswerProvenance = 'known_profile' | 'clawdbot_inferred' | 'user_clarification_required';

export interface AnswerBase {
  field_id: string;
  answer_type: AnswerType;
  confidence: number;
  rationale_short: string;
  requires_human_review: boolean;
  provenance: AnswerProvenance;
}

export interface ScalarAnswer extends AnswerBase {
  answer_type: 'scalar';
  value: string | number | boolean;
}

export interface OptionAnswer extends AnswerBase {
  answer_type: 'option';
  value: string;
}

export interface MultiSelectAnswer extends AnswerBase {
  answer_type: 'multi_select';
  value: string[];
}

export interface FileActionValue {
  action: 'upload' | 'skip';
  file_path: string | null;
  file_kind: 'resume' | 'cover_letter' | 'portfolio' | 'other';
}

export interface FileActionAnswer extends AnswerBase {
  answer_type: 'file_action';
  value: FileActionValue;
}

export interface SkipAnswer extends AnswerBase {
  answer_type: 'skip';
  value: null;
}

export type AnswerPlanItem =
  | ScalarAnswer
  | OptionAnswer
  | MultiSelectAnswer
  | FileActionAnswer
  | SkipAnswer;

export interface AmbiguousField {
  field_id: string;
  issue: string;
  candidate_values: string[];
  recommendation: string | null;
}

export interface AnswerPlan {
  status: AnswerPlanStatus;
  reason: string;
  ats: AtsType;
  application_url: string;
  submit_allowed: boolean;
  answers: AnswerPlanItem[];
  ambiguous_fields: AmbiguousField[];
  notes: string[];
  generated_at: string;
}
