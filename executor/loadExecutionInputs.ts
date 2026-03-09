import { readFile } from 'node:fs/promises';
import { isAnswerPlan } from '../playwright/schemas/answerPlanValidators.js';
import { isExtractedFormResult } from '../playwright/schemas/validators.js';
import { ExecutorError } from './errors.js';
import type { ExecutionInputs } from './types.js';

export async function loadExecutionInputs(extractedFormPath: string, answerPlanPath: string): Promise<ExecutionInputs> {
  const extractedRaw = await readJsonFile(extractedFormPath);
  const answerPlanRaw = await readJsonFile(answerPlanPath);

  if (!isExtractedFormResult(extractedRaw) || extractedRaw.status !== 'success') {
    throw new ExecutorError('field_not_found', 'Extracted form artifact is invalid or not successful', null, {
      extractedFormPath
    });
  }

  if (!isAnswerPlan(answerPlanRaw)) {
    throw new ExecutorError('field_not_found', 'Answer plan artifact failed schema validation', null, {
      answerPlanPath
    });
  }

  const fieldsById = new Map(extractedRaw.fields.map((field) => [field.field_id, field]));

  for (const answer of answerPlanRaw.answers) {
    if (!fieldsById.has(answer.field_id)) {
      throw new ExecutorError('field_not_found', 'Answer plan references unknown field_id', answer.field_id, {
        answerPlanPath,
        extractedFormPath
      });
    }
    if (!['scalar', 'option', 'multi_select', 'file_action', 'skip'].includes(answer.answer_type)) {
      throw new ExecutorError('unsupported_field_type', 'Unsupported answer type in execution input', answer.field_id, {
        answerType: answer.answer_type
      });
    }
  }

  return {
    extractedForm: extractedRaw,
    answerPlan: answerPlanRaw,
    extractedFormPath,
    answerPlanPath,
    fieldsById
  };
}

async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}
