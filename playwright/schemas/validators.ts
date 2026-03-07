import type { ExtractedFormResult, ExtractedFormSuccess, FieldType } from './types.js';

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

function isSuccess(obj: Record<string, unknown>): obj is ExtractedFormSuccess {
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
      ALLOWED_TYPES.has(f.type as FieldType)
    );
  });
}
