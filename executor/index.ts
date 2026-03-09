import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import type {
  AnswerPlanItem,
  FileActionAnswer,
  MultiSelectAnswer,
  OptionAnswer,
  ScalarAnswer,
  SkipAnswer
} from '../playwright/schemas/answerPlanTypes.js';
import { nowIso, timestampForFile } from '../playwright/utils/text.js';
import { applyFileAction } from './applyFileAction.js';
import { applyMultiSelect } from './applyMultiSelect.js';
import { applyOption } from './applyOption.js';
import { applyScalar } from './applyScalar.js';
import { applySkip } from './applySkip.js';
import { getHandlerName } from './dispatch.js';
import { ExecutorError } from './errors.js';
import { loadExecutionInputs } from './loadExecutionInputs.js';
import { submitFlow } from './submitFlow.js';
import { verifyReadyToSubmit } from './verifyReadyToSubmit.js';
import { writeExecutionArtifact } from './writeExecutionArtifact.js';
import type { ExecutionActionResult, ExecutionFailedField, ExecutionResultArtifact, ExecutorOptions } from './types.js';

export async function runExecutor(
  extractedFormPath: string,
  answerPlanPath: string,
  options: ExecutorOptions = {}
): Promise<{ result: ExecutionResultArtifact; artifactPath: string }> {
  const dryRun = options.dryRun ?? true;
  const attemptSubmit = options.attemptSubmit ?? false;
  const mockMode = options.mockMode ?? true;
  const headless = options.headless ?? true;
  const timeoutMs = options.timeoutMs ?? 45_000;
  const traceEnabled = options.traceEnabled ?? true;

  const startedAt = nowIso();
  const appliedActions: ExecutionActionResult[] = [];
  const skippedFields: string[] = [];
  const failedFields: ExecutionFailedField[] = [];
  const screenshots: string[] = [];
  let tracePath: string | null = null;
  let submitAttempted = false;
  let submitSucceeded = false;
  let failureCode: ExecutionResultArtifact['failure_code'] = null;
  const notes: string[] = [];

  const runtimeScreenshotsDir = resolve('artifacts/screenshots');
  const runtimeTracesDir = resolve('artifacts/traces');
  await mkdir(runtimeScreenshotsDir, { recursive: true });
  await mkdir(runtimeTracesDir, { recursive: true });

  const inputs = await loadExecutionInputs(extractedFormPath, answerPlanPath);

  if (mockMode) {
    for (const answer of inputs.answerPlan.answers) {
      const field = inputs.fieldsById.get(answer.field_id);
      if (!field) {
        throw new ExecutorError('field_not_found', 'Field not found in extracted form', answer.field_id);
      }
      appliedActions.push({
        field_id: field.field_id,
        answer_type: answer.answer_type,
        status: answer.answer_type === 'skip' ? 'skipped' : 'applied',
        message: `Mock ${answer.answer_type} action recorded`
      });
      if (answer.answer_type === 'skip') {
        skippedFields.push(field.field_id);
      }
    }

    if (attemptSubmit && !dryRun) {
      if (inputs.answerPlan.status !== 'proceed' || !inputs.answerPlan.submit_allowed) {
        failureCode = 'submit_blocked_by_policy';
        notes.push('submit_blocked_by_policy: Submission blocked by answer plan policy state');
      } else {
        submitAttempted = true;
        submitSucceeded = true;
        notes.push('Mock submit recorded as successful');
      }
    } else {
      notes.push('Mock dry-run: submit not attempted');
    }
  } else {
    const browser = await chromium.launch({ headless });
    const context = await browser.newContext(
      options.storageStatePath ? { storageState: options.storageStatePath } : undefined
    );
    const page = await context.newPage();

    if (traceEnabled) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }

    try {
      await page.goto(inputs.extractedForm.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

      for (const answer of inputs.answerPlan.answers) {
        const field = inputs.fieldsById.get(answer.field_id);
        if (!field) {
          throw new ExecutorError('field_not_found', 'Field not found in extracted form', answer.field_id);
        }

        try {
          const action = await dispatchHandler(page, field, answer);
          appliedActions.push(action);
          if (action.status === 'skipped') {
            skippedFields.push(answer.field_id);
          }
        } catch (error) {
          if (error instanceof ExecutorError) {
            failedFields.push({ field_id: answer.field_id, code: error.code, message: error.message });
            failureCode = error.code;
            const screenshotPath = resolve(runtimeScreenshotsDir, `${timestampForFile()}_${answer.field_id}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
            screenshots.push(screenshotPath);
            throw error;
          }

          throw error;
        }
      }

      await verifyReadyToSubmit(page, inputs.extractedForm, inputs.answerPlan);

      const submitResult = await submitFlow(page, inputs.answerPlan, { dryRun, attemptSubmit });
      submitAttempted = submitResult.submitAttempted;
      submitSucceeded = submitResult.submitSucceeded;
      notes.push(submitResult.note);
    } catch (error) {
      try {
        if (error instanceof ExecutorError) {
          failureCode = error.code;
          notes.push(`${error.code}: ${error.message}`);
        } else {
          failureCode = 'verification_failed';
          notes.push(`verification_failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      } finally {
        if (traceEnabled) {
          tracePath = resolve(runtimeTracesDir, `${timestampForFile()}_execution_trace.zip`);
          await context.tracing.stop({ path: tracePath }).catch(() => {
            tracePath = null;
          });
        }
        await context.close();
        await browser.close();
      }
    }
  }

  const endedAt = nowIso();
  const status: ExecutionResultArtifact['status'] = failureCode ? 'error' : 'success';

  const result: ExecutionResultArtifact = {
    status,
    application_url: inputs.extractedForm.url,
    ats: inputs.extractedForm.ats,
    extracted_form_path: extractedFormPath,
    answer_plan_path: answerPlanPath,
    started_at: startedAt,
    ended_at: endedAt,
    applied_actions: appliedActions,
    skipped_fields: skippedFields,
    failed_fields: failedFields,
    screenshots,
    trace_path: tracePath,
    submit_attempted: submitAttempted,
    submit_succeeded: submitSucceeded,
    failure_code: failureCode,
    notes
  };

  const artifactPath = await writeExecutionArtifact(result);
  return { result, artifactPath };
}

async function dispatchHandler(
  page: import('playwright').Page,
  field: import('../playwright/schemas/types.js').ExtractedField,
  answer: AnswerPlanItem
): Promise<ExecutionActionResult> {
  switch (answer.answer_type) {
    case 'scalar':
      getHandlerName(answer.answer_type);
      return applyScalar(page, field, answer as ScalarAnswer);
    case 'option':
      getHandlerName(answer.answer_type);
      return applyOption(page, field, answer as OptionAnswer);
    case 'multi_select':
      getHandlerName(answer.answer_type);
      return applyMultiSelect(page, field, answer as MultiSelectAnswer);
    case 'file_action':
      getHandlerName(answer.answer_type);
      return applyFileAction(page, field, answer as FileActionAnswer);
    case 'skip':
      getHandlerName(answer.answer_type);
      return applySkip(page, field, answer as SkipAnswer);
    default:
      throw new ExecutorError('unsupported_field_type', 'Unsupported answer type handler', field.field_id, {
        answerType: (answer as { answer_type: string }).answer_type
      });
  }
}
