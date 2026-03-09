import type { ScalarAnswer } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';
import { resolveFieldLocator } from './fieldResolvers.js';
import { verifyFilledValue } from './verifyFieldState.js';
import type { ExecutionActionResult } from './types.js';

export async function applyScalar(page: import('playwright').Page, field: ExtractedField, answer: ScalarAnswer): Promise<ExecutionActionResult> {
  if (!['text', 'email', 'tel', 'textarea', 'unknown'].includes(field.type)) {
    throw new ExecutorError('unsupported_field_type', 'Scalar answer cannot be applied to this field type', field.field_id, {
      fieldType: field.type
    });
  }

  if (typeof answer.value === 'boolean') {
    throw new ExecutorError('unsupported_field_type', 'Boolean scalar values are not supported for text-like fields', field.field_id);
  }

  const value = String(answer.value);
  const { locator } = await resolveFieldLocator(page, field);
  await locator.fill(value);
  await verifyFilledValue(locator, value, field.field_id);

  return {
    field_id: field.field_id,
    answer_type: answer.answer_type,
    status: 'applied',
    message: 'Scalar value applied and verified'
  };
}
