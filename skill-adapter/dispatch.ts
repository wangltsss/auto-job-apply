import {
  enqueueJob,
  queryIncidents,
  queryJob,
  queryLedger,
  queryRun,
  startRun
} from '../package-api/index.js';
import { SKILL_OPERATION_DESCRIPTORS } from './operations.js';
import type { SkillOperationInputMap, SkillOperationName, SkillOperationResultMap } from './types.js';

export async function dispatchSkillOperation<T extends SkillOperationName>(
  operation: T,
  input: SkillOperationInputMap[T]
): Promise<SkillOperationResultMap[T]> {
  switch (operation) {
    case 'describe_operations':
      return { operations: SKILL_OPERATION_DESCRIPTORS } as SkillOperationResultMap[T];
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
