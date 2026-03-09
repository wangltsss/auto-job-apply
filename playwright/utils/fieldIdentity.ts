import { createHash } from 'node:crypto';
import { cleanText } from './text.js';

interface FieldIdentityInput {
  nameAttr: string | null;
  idAttr: string | null;
  label: string;
  section: string | null;
  index: number;
}

export function buildStableFieldId(input: FieldIdentityInput): string {
  const name = normalizedToken(input.nameAttr);
  if (name) {
    return name;
  }

  const id = normalizedToken(input.idAttr);
  if (id) {
    return id;
  }

  const label = normalizedToken(input.label);
  if (label) {
    return label;
  }

  const sectionLabel = normalizedToken(`${input.section ?? ''}-${input.label}`);
  if (sectionLabel) {
    return sectionLabel;
  }

  const hashInput = `${input.nameAttr ?? ''}|${input.idAttr ?? ''}|${input.label}|${input.section ?? ''}|${input.index}`;
  const hash = createHash('sha1').update(hashInput).digest('hex').slice(0, 10);
  return `field-${hash}`;
}

function normalizedToken(input: string | null): string | null {
  const text = cleanText(input ?? '').toLowerCase();
  if (!text) {
    return null;
  }

  const slug = text
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');

  return slug || null;
}
