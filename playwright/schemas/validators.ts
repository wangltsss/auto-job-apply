import type {
  ExtractedFormResult,
  ExtractedFormSuccess,
  FieldType,
  FileKind,
  GroupType,
  SemanticCategory,
  Sensitivity
} from './types.js';

const ALLOWED_TYPES: Set<FieldType> = new Set([
  'text',
  'email',
  'tel',
  'textarea',
  'checkbox',
  'radio',
  'select',
  'combobox',
  'file',
  'unknown'
]);
const ALLOWED_SEMANTIC: Set<SemanticCategory> = new Set([
  'personal_identity',
  'contact_info',
  'profile_link',
  'work_authorization',
  'employment_history',
  'compensation',
  'attachment',
  'demographic',
  'unknown'
]);
const ALLOWED_SENSITIVITY: Set<Sensitivity> = new Set(['none', 'demographic', 'legal', 'compensation']);
const ALLOWED_FILE_KIND: Set<FileKind> = new Set(['resume', 'cover_letter', 'other', 'unknown']);
const ALLOWED_GROUP_TYPE: Set<GroupType> = new Set(['none', 'single_choice', 'multi_choice']);

export function isExtractedFormResult(value: unknown): value is ExtractedFormResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (obj.status === 'success') {
    return isSuccess(obj);
  }

  if (obj.status === 'blocked' || obj.status === 'error') {
    return (
      typeof obj.reason === 'string' &&
      typeof obj.current_url === 'string' &&
      typeof obj.ats_guess === 'string' &&
      typeof obj.extracted_at === 'string'
    );
  }

  return false;
}

function isSuccess(obj: Record<string, unknown>): boolean {
  if (
    typeof obj.url !== 'string' ||
    typeof obj.ats !== 'string' ||
    typeof obj.page_title !== 'string' ||
    typeof obj.form_ready !== 'boolean' ||
    typeof obj.submit_visible !== 'boolean' ||
    typeof obj.submit_enabled !== 'boolean' ||
    !Array.isArray(obj.fields) ||
    !Array.isArray(obj.warnings) ||
    typeof obj.extracted_at !== 'string'
  ) {
    return false;
  }

  return obj.fields.every((field) => {
    if (!field || typeof field !== 'object') {
      return false;
    }
    const f = field as Record<string, unknown>;
    return (
      typeof f.field_id === 'string' &&
      typeof f.label === 'string' &&
      typeof f.required === 'boolean' &&
      typeof f.visible === 'boolean' &&
      typeof f.enabled === 'boolean' &&
      Array.isArray(f.options) &&
      typeof f.type === 'string' &&
      ALLOWED_TYPES.has(f.type as FieldType) &&
      typeof f.options_deferred === 'boolean' &&
      typeof f.auto_answer_safe === 'boolean' &&
      typeof f.internal === 'boolean' &&
      (typeof f.group_id === 'string' || f.group_id === null) &&
      (typeof f.group_label === 'string' || f.group_label === null) &&
      (typeof f.source_tag === 'string' || f.source_tag === null) &&
      (typeof f.name_attr === 'string' || f.name_attr === null) &&
      (typeof f.id_attr === 'string' || f.id_attr === null) &&
      (typeof f.aria_label === 'string' || f.aria_label === null) &&
      typeof f.semantic_category === 'string' &&
      ALLOWED_SEMANTIC.has(f.semantic_category as SemanticCategory) &&
      typeof f.sensitivity === 'string' &&
      ALLOWED_SENSITIVITY.has(f.sensitivity as Sensitivity) &&
      typeof f.file_kind === 'string' &&
      ALLOWED_FILE_KIND.has(f.file_kind as FileKind) &&
      typeof f.group_type === 'string' &&
      ALLOWED_GROUP_TYPE.has(f.group_type as GroupType)
    );
  });
}
