import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import { ExecutorError } from './errors.js';

export async function submitFlow(
  page: import('playwright').Page,
  answerPlan: AnswerPlan,
  options: { dryRun: boolean; attemptSubmit: boolean }
): Promise<{ submitAttempted: boolean; submitSucceeded: boolean; note: string }> {
  if (!options.attemptSubmit || options.dryRun) {
    return {
      submitAttempted: false,
      submitSucceeded: false,
      note: 'Dry-run mode or submit not requested'
    };
  }

  if (answerPlan.status !== 'proceed' || answerPlan.submit_allowed !== true) {
    throw new ExecutorError('submit_blocked_by_policy', 'Submission blocked by answer plan policy state', null, {
      status: answerPlan.status,
      submit_allowed: answerPlan.submit_allowed
    });
  }

  const submitButton = page.getByRole('button', { name: /submit|apply|send application/i }).first();
  const visible = await submitButton.isVisible().catch(() => false);
  const enabled = await submitButton.isEnabled().catch(() => false);

  if (!visible || !enabled) {
    throw new ExecutorError('submit_failed', 'Submit button is not visible or enabled', null, {
      visible,
      enabled
    });
  }

  await submitButton.click();

  return {
    submitAttempted: true,
    submitSucceeded: true,
    note: 'Submit button clicked'
  };
}
