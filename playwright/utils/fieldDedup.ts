import type { ExtractedField } from '../schemas/types.js';
import { cleanText } from './text.js';

export function deduplicateFields(fields: ExtractedField[]): ExtractedField[] {
  const byKey = new Map<string, ExtractedField>();

  for (const field of fields) {
    const key = dedupeKey(field);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, field);
      continue;
    }

    byKey.set(key, choosePreferredField(existing, field));
  }

  return Array.from(byKey.values());
}

function dedupeKey(field: ExtractedField): string {
  const fieldIdKey = normalize(field.field_id);
  if (fieldIdKey && !fieldIdKey.startsWith('field_') && !fieldIdKey.startsWith('field-')) {
    return `field_id:${fieldIdKey}`;
  }

  const nameKey = normalize(field.name_attr);
  if (nameKey) {
    return `name:${nameKey}`;
  }

  const idKey = normalize(field.id_attr);
  if (idKey) {
    return `id:${idKey}`;
  }

  const selectorKey = normalize(field.selector_hint);
  if (selectorKey) {
    return `selector:${selectorKey}`;
  }

  const labelKey = normalize(field.label);
  const sectionKey = normalize(field.section);
  return `label:${sectionKey}:${labelKey}`;
}

function choosePreferredField(a: ExtractedField, b: ExtractedField): ExtractedField {
  const scoreA = scoreField(a);
  const scoreB = scoreField(b);

  if (scoreA > scoreB) {
    return a;
  }
  if (scoreB > scoreA) {
    return b;
  }

  const tieA = tieBreakToken(a);
  const tieB = tieBreakToken(b);
  return tieA <= tieB ? a : b;
}

function scoreField(field: ExtractedField): number {
  let score = 0;

  if (field.id_attr) {
    score += 40;
  }
  if (field.name_attr) {
    score += 40;
  }
  if (field.selector_hint) {
    score += 20;
  }
  if (field.aria_label) {
    score += 10;
  }
  if (field.type !== 'unknown') {
    score += 15;
  }

  const typeWeights: Record<string, number> = {
    tel: 12,
    email: 12,
    file: 12,
    combobox: 10,
    select: 10,
    textarea: 8,
    radio: 8,
    checkbox: 8,
    text: 5,
    unknown: 0
  };
  score += typeWeights[field.type] ?? 0;

  if (field.required) {
    score += 5;
  }
  if (field.options.length > 0) {
    score += 5;
  }
  if (field.source_tag === 'combobox_widget') {
    score += 5;
  }
  if (field.validation_text) {
    score += 3;
  }

  return score;
}

function tieBreakToken(field: ExtractedField): string {
  return [
    normalize(field.name_attr),
    normalize(field.id_attr),
    normalize(field.selector_hint),
    normalize(field.label),
    normalize(field.type)
  ].join('|');
}

function normalize(value: string | null): string {
  return cleanText(value ?? '').toLowerCase();
}
