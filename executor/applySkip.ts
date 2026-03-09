import type { SkipAnswer } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';
import type { ExecutionActionResult } from './types.js';

export async function applySkip(_page: import('playwright').Page, field: ExtractedField, answer: SkipAnswer): Promise<ExecutionActionResult> {
  return {
    field_id: field.field_id,
    answer_type: answer.answer_type,
    status: 'skipped',
    message: 'Skipped by answer plan instruction'
  };
}
