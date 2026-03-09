import type { MultiSelectAnswer } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';
import { resolveFieldLocator } from './fieldResolvers.js';
import type { ExecutionActionResult } from './types.js';

export async function applyMultiSelect(page: import('playwright').Page, field: ExtractedField, answer: MultiSelectAnswer): Promise<ExecutionActionResult> {
  if (field.type !== 'select') {
    throw new ExecutorError('unsupported_field_type', 'Multi-select answer cannot be applied to this field type', field.field_id, {
      fieldType: field.type
    });
  }

  const { locator } = await resolveFieldLocator(page, field);
  await locator.selectOption(answer.value.map((value) => ({ label: value }))).catch(async () => {
    await locator.selectOption(answer.value.map((value) => ({ value })));
  });

  return {
    field_id: field.field_id,
    answer_type: answer.answer_type,
    status: 'applied',
    message: `Multi-select applied for ${answer.value.length} options`
  };
}
