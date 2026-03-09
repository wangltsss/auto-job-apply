import type { OptionAnswer } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';
import { resolveFieldLocator } from './fieldResolvers.js';
import { verifySelectedValue } from './verifyFieldState.js';
import type { ExecutionActionResult } from './types.js';

export async function applyOption(page: import('playwright').Page, field: ExtractedField, answer: OptionAnswer): Promise<ExecutionActionResult> {
  if (!['select', 'combobox', 'radio'].includes(field.type)) {
    throw new ExecutorError('unsupported_field_type', 'Option answer cannot be applied to this field type', field.field_id, {
      fieldType: field.type
    });
  }

  if (field.type === 'radio') {
    const radio = page.getByLabel(answer.value, { exact: false }).first();
    if (!(await radio.count())) {
      throw new ExecutorError('locator_resolution_failed', 'Radio option label not found', field.field_id, {
        option: answer.value
      });
    }
    await radio.check();
    const checked = await radio.isChecked().catch(() => false);
    if (!checked) {
      throw new ExecutorError('verification_failed', 'Radio option was not checked', field.field_id, {
        option: answer.value
      });
    }
  } else if (field.type === 'select') {
    const { locator } = await resolveFieldLocator(page, field);
    await locator.selectOption({ label: answer.value }).catch(async () => {
      await locator.selectOption({ value: answer.value });
    });
    await verifySelectedValue(locator, answer.value, field.field_id);
  } else {
    const { locator } = await resolveFieldLocator(page, field);
    await locator.click();
    await locator.fill(answer.value).catch(() => undefined);

    const optionNode = page.getByRole('option', { name: answer.value, exact: false }).first();
    if (await optionNode.count()) {
      await optionNode.click();
    } else {
      throw new ExecutorError('verification_failed', 'Combobox option not found in rendered list', field.field_id, {
        option: answer.value
      });
    }

    await verifySelectedValue(locator, answer.value, field.field_id);
  }

  return {
    field_id: field.field_id,
    answer_type: answer.answer_type,
    status: 'applied',
    message: 'Single option applied and verified'
  };
}
