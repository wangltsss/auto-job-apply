import type { Locator } from 'playwright';
import { ExecutorError } from './errors.js';

export async function verifyFilledValue(locator: Locator, expected: string, fieldId: string): Promise<void> {
  const actual = await locator.inputValue().catch(() => '');
  if (actual !== expected) {
    throw new ExecutorError('verification_failed', 'Filled value does not match expected value', fieldId, {
      expected,
      actual
    });
  }
}

export async function verifySelectedValue(locator: Locator, expected: string, fieldId: string): Promise<void> {
  const value = await locator.inputValue().catch(() => '');
  if (value === expected) {
    return;
  }

  const selectedTexts = await locator
    .locator('option:checked')
    .allInnerTexts()
    .catch(() => [] as string[]);

  if (!selectedTexts.some((text) => text.trim() === expected)) {
    throw new ExecutorError('verification_failed', 'Selected value does not match expected option', fieldId, {
      expected,
      value,
      selectedTexts
    });
  }
}

export async function verifyFileAttachment(locator: Locator, fieldId: string): Promise<void> {
  const fileCount = await locator.evaluate((el) => {
    const input = el as HTMLInputElement;
    return input.files?.length ?? 0;
  }).catch(() => 0);

  if (fileCount < 1) {
    throw new ExecutorError('verification_failed', 'No file appears attached after upload action', fieldId);
  }
}
