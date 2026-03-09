import type { FileKind, SemanticCategory, Sensitivity } from '../schemas/types.js';
import { cleanText } from './text.js';

interface SemanticInput {
  label: string;
  section: string | null;
  helpText: string | null;
  nameAttr: string | null;
  idAttr: string | null;
  type: string;
}

export function inferSemanticCategory(input: SemanticInput): SemanticCategory {
  const haystack = fullHaystack(input);

  if (input.type === 'file') {
    return 'attachment';
  }
  if (contains(haystack, ['email', 'phone', 'mobile', 'linkedin', 'github', 'portfolio', 'website', 'contact'])) {
    return contains(haystack, ['linkedin', 'github', 'portfolio', 'website']) ? 'profile_link' : 'contact_info';
  }
  if (contains(haystack, ['first name', 'last name', 'full name', 'preferred name'])) {
    return 'personal_identity';
  }
  if (contains(haystack, ['work authorization', 'authorized', 'sponsorship', 'visa', 'eligible to work'])) {
    return 'work_authorization';
  }
  if (contains(haystack, ['gender', 'race', 'ethnicity', 'veteran', 'disability', 'pronouns', 'self-identify', 'equal employment opportunity', 'eeo'])) {
    return 'demographic';
  }
  if (contains(haystack, ['current company', 'experience', 'employment', 'work history'])) {
    return 'employment_history';
  }
  if (contains(haystack, ['salary', 'compensation', 'pay', 'rate'])) {
    return 'compensation';
  }

  return 'unknown';
}

export function inferSensitivity(input: SemanticInput, semanticCategory: SemanticCategory): Sensitivity {
  if (semanticCategory === 'demographic') {
    return 'demographic';
  }
  if (semanticCategory === 'compensation') {
    return 'compensation';
  }

  const haystack = fullHaystack(input);
  if (contains(haystack, ['work authorization', 'authorized', 'sponsorship', 'visa', 'eligible to work'])) {
    return 'legal';
  }

  return 'none';
}

export function inferAutoAnswerSafe(sensitivity: Sensitivity): boolean {
  return sensitivity === 'none';
}

export function inferFileKind(input: Pick<SemanticInput, 'label' | 'section' | 'helpText' | 'nameAttr' | 'idAttr'>): FileKind {
  const haystack = cleanText(`${input.label} ${input.section ?? ''} ${input.helpText ?? ''} ${input.nameAttr ?? ''} ${input.idAttr ?? ''}`).toLowerCase();
  if (!haystack) {
    return 'unknown';
  }

  if (contains(haystack, ['resume', 'cv'])) {
    return 'resume';
  }
  if (contains(haystack, ['cover letter'])) {
    return 'cover_letter';
  }
  if (contains(haystack, ['portfolio', 'sample', 'attachment'])) {
    return 'other';
  }

  return 'unknown';
}

export function enrichWeakFileLabel(label: string, fileKind: FileKind): string {
  const cleaned = cleanText(label);
  if (!/^(attach|upload|choose file)$/i.test(cleaned) || fileKind === 'unknown') {
    return cleaned || 'File upload';
  }

  if (fileKind === 'resume') {
    return 'Attach resume';
  }
  if (fileKind === 'cover_letter') {
    return 'Attach cover letter';
  }
  return 'Attach file';
}

function contains(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function fullHaystack(input: SemanticInput): string {
  return cleanText(`${input.label} ${input.section ?? ''} ${input.helpText ?? ''} ${input.nameAttr ?? ''} ${input.idAttr ?? ''}`).toLowerCase();
}
