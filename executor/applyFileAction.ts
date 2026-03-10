import { access } from 'node:fs/promises';
import type { FileActionAnswer } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { ExecutorError } from './errors.js';
import { resolveFieldLocator } from './fieldResolvers.js';
import { verifyFileAttachment } from './verifyFieldState.js';
import type { ExecutionActionResult } from './types.js';

export async function applyFileAction(page: import('playwright').Page, field: ExtractedField, answer: FileActionAnswer): Promise<ExecutionActionResult> {
  if (field.type !== 'file') {
    throw new ExecutorError('unsupported_field_type', 'File action cannot be applied to non-file field', field.field_id, {
      fieldType: field.type
    });
  }

  if (answer.value.action === 'skip') {
    return {
      field_id: field.field_id,
      answer_type: answer.answer_type,
      status: 'skipped',
      message: 'File action explicitly skipped'
    };
  }

  const path = answer.value.file_path;
  if (!path) {
    throw new ExecutorError('upload_failed', 'File upload requested but file_path is missing', field.field_id);
  }

  try {
    await access(path);
  } catch (error) {
    throw new ExecutorError('upload_failed', 'File path not accessible for upload', field.field_id, {
      filePath: path,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const { locator } = await resolveFieldLocator(page, field);
  await locator.setInputFiles(path).catch((error) => {
    throw new ExecutorError('upload_widget_bind_failed', 'Failed to bind uploaded file into widget', field.field_id, {
      filePath: path,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  await verifyFileAttachment(locator, field.field_id);

  return {
    field_id: field.field_id,
    answer_type: answer.answer_type,
    status: 'applied',
    message: 'File uploaded and verified'
  };
}
