import type { FieldType } from '../schemas/types.js';

interface FieldTypeInput {
  inputType: string | null;
  role: string | null;
  nameAttr: string | null;
  idAttr: string | null;
  label: string | null;
}

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

export function inferFieldType(input: FieldTypeInput): FieldType {
  const strictType = inferTypeFromInput(input.inputType, input.role);
  if (strictType !== 'text' && strictType !== 'unknown') {
    return strictType;
  }

  if (strictType === 'text') {
    const haystack = `${input.nameAttr ?? ''} ${input.idAttr ?? ''} ${input.label ?? ''}`.toLowerCase();
    if (haystack.includes('email')) {
      return 'email';
    }
    if (haystack.includes('phone') || haystack.includes('mobile') || haystack.includes('tel')) {
      return 'tel';
    }
    return 'text';
  }

  if ((input.role ?? '').toLowerCase() === 'combobox') {
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
