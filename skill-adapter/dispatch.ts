import {
  enqueueJob,
  queryIncidents,
  queryJob,
  queryLedger,
  queryRun,
  startRun
} from '../package-api/index.js';
import { SKILL_OPERATION_DESCRIPTORS } from './operations.js';
import type { EnqueueJobInput, StartRunInput } from '../package-api/index.js';
import type {
  SkillOperationInputMap,
  SkillOperationName,
  SkillOperationResultMap,
  SlashApplyInput,
  SlashIngestInput
} from './types.js';

function normalizeSlashIngestInput(input: SlashIngestInput): EnqueueJobInput {
  const urls = input.urls ?? (input.url ? [input.url] : []);
  if (urls.length === 0) {
    throw new Error('/ingest requires url or urls');
  }

  const jobs: EnqueueJobInput['jobs'] = urls.map((url) => ({
    source_type: input.source_type,
    source_url: url,
    apply_url: input.apply_url,
    company: input.company,
    title: input.title,
    location: input.location,
    employment_type: input.employment_type,
    posted_at: input.posted_at,
    notes: input.notes,
    raw_payload: input.raw_payload
  }));

  return {
    jobs,
    storePath: input.storePath
  };
}

function normalizeSlashApplyInput(input: SlashApplyInput): StartRunInput {
  const targetSuccessCount = input.target_success_count ?? input.count;
  if (!targetSuccessCount || !Number.isInteger(targetSuccessCount) || targetSuccessCount <= 0) {
    throw new Error('/apply requires a positive count or target_success_count');
  }

  return {
    ...input,
    target_success_count: targetSuccessCount
  };
}

export async function dispatchSkillOperation<T extends SkillOperationName>(
  operation: T,
  input: SkillOperationInputMap[T]
): Promise<SkillOperationResultMap[T]> {
  switch (operation) {
    case 'describe_operations':
      return { operations: SKILL_OPERATION_DESCRIPTORS } as SkillOperationResultMap[T];
    case '/ingest':
      return enqueueJob(normalizeSlashIngestInput(input as SkillOperationInputMap['/ingest'])) as Promise<SkillOperationResultMap[T]>;
    case '/apply':
      return startRun(normalizeSlashApplyInput(input as SkillOperationInputMap['/apply'])) as Promise<SkillOperationResultMap[T]>;
    case 'enqueue_posting':
      return enqueueJob(input as SkillOperationInputMap['enqueue_posting']) as Promise<SkillOperationResultMap[T]>;
    case 'query_job':
      return queryJob(input as SkillOperationInputMap['query_job']) as Promise<SkillOperationResultMap[T]>;
    case 'start_run':
      return startRun(input as SkillOperationInputMap['start_run']) as Promise<SkillOperationResultMap[T]>;
    case 'query_run':
      return queryRun(input as SkillOperationInputMap['query_run']) as Promise<SkillOperationResultMap[T]>;
    case 'query_ledger':
      return queryLedger(input as SkillOperationInputMap['query_ledger']) as Promise<SkillOperationResultMap[T]>;
    case 'query_incidents':
      return queryIncidents(input as SkillOperationInputMap['query_incidents']) as Promise<SkillOperationResultMap[T]>;
    default: {
      const unreachable: never = operation;
      throw new Error(`Unsupported skill operation: ${String(unreachable)}`);
    }
  }
}
