import type { Locator, Page } from 'playwright';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';
import type { LocatorResolution } from './types.js';

export async function resolveFieldLocator(page: Page, field: ExtractedField): Promise<{ locator: Locator; resolution: LocatorResolution }> {
  const candidates = buildSelectorCandidatesForField(field);

  for (const candidate of candidates) {
    const locator = page.locator(candidate.selector).first();
    if (await locator.count()) {
      return {
        locator,
        resolution: {
          strategy: candidate.strategy,
          selector: candidate.selector
        }
      };
    }
  }

  if (field.label) {
    const byLabel = page.getByLabel(field.label, { exact: false }).first();
    if (await byLabel.count()) {
      return {
        locator: byLabel,
        resolution: {
          strategy: 'label',
          selector: `label:${field.label}`
        }
      };
    }
  }

  throw new ExecutorError('locator_resolution_failed', 'Unable to resolve field locator', field.field_id, {
    field
  });
}

export function buildSelectorCandidatesForField(field: ExtractedField): Array<{ strategy: string; selector: string }> {
  const candidates: Array<{ strategy: string; selector: string }> = [];

  if (field.selector_hint) {
    candidates.push({ strategy: 'selector_hint', selector: field.selector_hint });
  }
  if (field.id_attr) {
    candidates.push({ strategy: 'id_attr', selector: `#${escapeCss(field.id_attr)}` });
  }
  if (field.name_attr) {
    candidates.push({ strategy: 'name_attr', selector: `[name="${escapeAttribute(field.name_attr)}"]` });
  }
  if (field.aria_label) {
    candidates.push({ strategy: 'aria_label', selector: `[aria-label="${escapeAttribute(field.aria_label)}"]` });
  }

  if (field.type === 'radio' && field.group_id) {
    candidates.push({ strategy: 'radio_group', selector: `input[type="radio"][name="${escapeAttribute(field.group_id)}"]` });
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates: Array<{ strategy: string; selector: string }>): Array<{ strategy: string; selector: string }> {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.selector)) {
      return false;
    }
    seen.add(candidate.selector);
    return true;
  });
}

function escapeCss(value: string): string {
  return value.replace(/(["\\.#:[\]])/g, '\\$1');
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '\\"');
}
