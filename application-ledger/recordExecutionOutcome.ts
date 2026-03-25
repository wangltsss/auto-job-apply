import { createHash } from 'node:crypto';
import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedFormSuccess } from '../playwright/schemas/types.js';
import type { ExecutionResultArtifact } from '../executor/types.js';
import { loadApplicationLedger, writeApplicationLedger } from './store.js';
import type {
  ApplicationAttemptRecord,
  ApplicationSuccessRecord,
  AnswerSummaryRecord,
  ClarificationItemRecord,
  FailureRecord
} from './types.js';

function buildStableId(prefix: string, input: string): string {
  return `${prefix}_${createHash('sha1').update(input).digest('hex').slice(0, 16)}`;
}

function summarizeAnswerPlan(answerPlan: AnswerPlan): AnswerSummaryRecord[] {
  return answerPlan.answers.map((answer) => ({
    field_id: answer.field_id,
    answer_type: answer.answer_type,
    confidence: answer.confidence,
    rationale_short: answer.rationale_short,
    requires_human_review: answer.requires_human_review,
    provenance: answer.provenance
  }));
}

export async function recordExecutionOutcome(
  params: {
    extractedForm: ExtractedFormSuccess;
    extractedFormPath: string;
    answerPlan: AnswerPlan;
    answerPlanPath: string;
    executionArtifactPath: string;
    result: ExecutionResultArtifact;
    jobId?: string | null;
  },
  storePath?: string
): Promise<{ ledgerStorePath: string; attemptRecord: ApplicationAttemptRecord; successRecord?: ApplicationSuccessRecord; failureRecord?: FailureRecord }> {
  const ledger = await loadApplicationLedger(storePath);
  const answerSummary = summarizeAnswerPlan(params.answerPlan);
  const fieldsById = new Map(params.extractedForm.fields.map((field) => [field.field_id, field]));

  const attemptRecord: ApplicationAttemptRecord = {
    attempt_id: buildStableId(
      'attempt',
      `${params.executionArtifactPath}:${params.result.started_at}:${params.result.ended_at}:${params.result.current_url ?? ''}`
    ),
    job_id: params.jobId ?? null,
    application_url: params.result.application_url,
    ats: params.result.ats,
    started_at: params.result.started_at,
    ended_at: params.result.ended_at,
    outcome: params.result.status === 'success' ? 'success' : 'failure',
    failure_code: params.result.failure_code,
    submit_attempted: params.result.submit_attempted,
    submit_succeeded: params.result.submit_succeeded,
    extracted_form_path: params.extractedFormPath,
    answer_plan_path: params.answerPlanPath,
    execution_artifact_path: params.executionArtifactPath,
    notes: params.result.notes,
    answer_summary: answerSummary
  };

  ledger.attempts.push(attemptRecord);

  let successRecord: ApplicationSuccessRecord | undefined;
  let failureRecord: FailureRecord | undefined;

  if (params.result.status === 'success') {
    successRecord = {
      application_id: buildStableId('application', `${attemptRecord.attempt_id}:${params.result.application_url}`),
      attempt_id: attemptRecord.attempt_id,
      job_id: attemptRecord.job_id,
      applied_at: params.result.ended_at,
      application_url: params.result.application_url,
      ats: params.result.ats,
      extracted_form_path: params.extractedFormPath,
      answer_plan_path: params.answerPlanPath,
      execution_artifact_path: params.executionArtifactPath,
      submitted_answers_summary: answerSummary
    };
    ledger.successes.push(successRecord);
  } else {
    failureRecord = {
      failure_id: buildStableId('failure', `${attemptRecord.attempt_id}:${params.result.failure_code ?? 'unknown'}`),
      attempt_id: attemptRecord.attempt_id,
      job_id: attemptRecord.job_id,
      detected_at: params.result.ended_at,
      application_url: params.result.application_url,
      ats: params.result.ats,
      failure_code: params.result.failure_code,
      message: params.result.notes[0] ?? 'Execution failed',
      details: {
        extracted_form_path: params.extractedFormPath,
        answer_plan_path: params.answerPlanPath,
        execution_artifact_path: params.executionArtifactPath,
        submit_attempted: params.result.submit_attempted,
        submit_succeeded: params.result.submit_succeeded,
        notes: params.result.notes
      }
    };
    ledger.failures.push(failureRecord);
  }

  const clarificationItems: ClarificationItemRecord[] = answerSummary
    .filter((answer) => answer.provenance === 'user_clarification_required')
    .map((answer) => {
      const field = fieldsById.get(answer.field_id);
      return {
        clarification_id: buildStableId('clarification', `${attemptRecord.attempt_id}:${answer.field_id}`),
        attempt_id: attemptRecord.attempt_id,
        job_id: attemptRecord.job_id,
        application_url: attemptRecord.application_url,
        ats: attemptRecord.ats,
        detected_at: attemptRecord.ended_at,
        field_id: answer.field_id,
        question_label: field?.label ?? null,
        answer_type: answer.answer_type,
        provenance: 'user_clarification_required',
        confidence: answer.confidence,
        rationale_short: answer.rationale_short,
        resolved: false
      };
    });

  ledger.clarifications.push(...clarificationItems);

  const ledgerStorePath = await writeApplicationLedger(ledger, storePath);

  return {
    ledgerStorePath,
    attemptRecord,
    successRecord,
    failureRecord
  };
}
