export function cleanText(input: string | null | undefined): string {
  if (!input) {
    return '';
  }
  return input.replace(/\s+/g, ' ').trim();
}

export function nullIfEmpty(input: string | null | undefined): string | null {
  const text = cleanText(input);
  return text.length > 0 ? text : null;
}

export function slugify(input: string): string {
  const cleaned = cleanText(input).toLowerCase();
  const slug = cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'page';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
