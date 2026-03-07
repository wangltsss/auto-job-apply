import type { FieldType } from '../schemas/types.js';

export function inferTypeFromInput(inputType: string | null, role: string | null): FieldType {
  const lowered = (inputType ?? '').toLowerCase();
  const loweredRole = (role ?? '').toLowerCase();

  if (lowered === 'text' || lowered === 'search' || lowered === 'url' || lowered === 'number') {
    return 'text';
  }
  if (lowered === 'email') {
    return 'email';
  }
  if (lowered === 'tel') {
    return 'tel';
  }
  if (lowered === 'checkbox') {
    return 'checkbox';
  }
  if (lowered === 'radio') {
    return 'radio';
  }
  if (lowered === 'file') {
    return 'file';
  }
  if (loweredRole === 'combobox') {
    return 'combobox';
  }
  return 'unknown';
}

export function isSubmitLike(text: string): boolean {
  return /(submit|apply|send application|review|next|continue)/i.test(text);
}

export function isLikelyRequired(label: string, ariaRequired: string | null, requiredAttr: string | null): boolean {
  if (ariaRequired === 'true' || requiredAttr !== null) {
    return true;
  }
  return /\*/.test(label) || /\(required\)/i.test(label);
}
