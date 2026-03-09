import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedFormSuccess } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';

export async function verifyReadyToSubmit(
  page: import('playwright').Page,
  extractedForm: ExtractedFormSuccess,
  answerPlan: AnswerPlan
): Promise<void> {
  const answeredFieldIds = new Set(answerPlan.answers.map((item) => item.field_id));
  const unresolvedRequired = extractedForm.fields.filter(
    (field) => field.required && !answeredFieldIds.has(field.field_id)
  );

  if (unresolvedRequired.length > 0) {
    throw new ExecutorError('verification_failed', 'Required fields are missing from answer plan coverage', null, {
      unresolvedRequired: unresolvedRequired.map((field) => field.field_id)
    });
  }

  const hasVisibleErrors = await page.locator('.error, .errors, .invalid-feedback, [aria-live="assertive"]').first().isVisible().catch(() => false);
  if (hasVisibleErrors) {
    throw new ExecutorError('verification_failed', 'Visible validation errors detected before submit', null);
  }
}
