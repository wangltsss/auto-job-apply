import type { AnswerPlan, AnswerPlanItem, AnswerType, FileActionValue } from './answerPlanTypes.js';

const ALLOWED_ANSWER_TYPES: Set<AnswerType> = new Set([
  'scalar',
  'option',
  'multi_select',
  'file_action',
  'skip'
]);

export function isAnswerPlan(value: unknown): value is AnswerPlan {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (
    !isStatus(obj.status) ||
    typeof obj.reason !== 'string' ||
    typeof obj.ats !== 'string' ||
    typeof obj.application_url !== 'string' ||
    typeof obj.submit_allowed !== 'boolean' ||
    !Array.isArray(obj.answers) ||
    !Array.isArray(obj.ambiguous_fields) ||
    !Array.isArray(obj.notes) ||
    typeof obj.generated_at !== 'string'
  ) {
    return false;
  }

  if (!obj.answers.every((item) => isAnswerItem(item))) {
    return false;
  }

  if (!obj.ambiguous_fields.every((item) => isAmbiguousField(item))) {
    return false;
  }

  if (!obj.notes.every((item) => typeof item === 'string')) {
    return false;
  }

  if (obj.status === 'proceed' && obj.submit_allowed !== true) {
    return false;
  }
  if ((obj.status === 'quarantine' || obj.status === 'not_eligible') && obj.submit_allowed !== false) {
    return false;
  }

  return true;
}

function isStatus(value: unknown): value is AnswerPlan['status'] {
  return value === 'proceed' || value === 'quarantine' || value === 'not_eligible';
}

function isAmbiguousField(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.field_id === 'string' &&
    typeof obj.issue === 'string' &&
    Array.isArray(obj.candidate_values) &&
    obj.candidate_values.every((entry) => typeof entry === 'string') &&
    (typeof obj.recommendation === 'string' || obj.recommendation === null)
  );
}

function isAnswerItem(value: unknown): value is AnswerPlanItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (
    typeof obj.field_id !== 'string' ||
    typeof obj.answer_type !== 'string' ||
    !ALLOWED_ANSWER_TYPES.has(obj.answer_type as AnswerType) ||
    typeof obj.confidence !== 'number' ||
    obj.confidence < 0 ||
    obj.confidence > 1 ||
    typeof obj.rationale_short !== 'string' ||
    typeof obj.requires_human_review !== 'boolean'
  ) {
    return false;
  }

  if (obj.answer_type === 'scalar') {
    return typeof obj.value === 'string' || typeof obj.value === 'number' || typeof obj.value === 'boolean';
  }

  if (obj.answer_type === 'option') {
    return typeof obj.value === 'string';
  }

  if (obj.answer_type === 'multi_select') {
    return Array.isArray(obj.value) && obj.value.every((entry) => typeof entry === 'string');
  }

  if (obj.answer_type === 'skip') {
    return obj.value === null;
  }

  if (obj.answer_type === 'file_action') {
    return isFileActionValue(obj.value);
  }

  return false;
}

function isFileActionValue(value: unknown): value is FileActionValue {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const validKind =
    obj.file_kind === 'resume' ||
    obj.file_kind === 'cover_letter' ||
    obj.file_kind === 'portfolio' ||
    obj.file_kind === 'other';
  if (!validKind) {
    return false;
  }

  if (obj.action === 'upload') {
    return typeof obj.file_path === 'string' && obj.file_path.length > 0;
  }
  if (obj.action === 'skip') {
    return obj.file_path === null;
  }
  return false;
}
