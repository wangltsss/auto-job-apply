import type { SkillOperationDescriptor } from './types.js';

export const SKILL_OPERATION_DESCRIPTORS: SkillOperationDescriptor[] = [
  {
    name: 'describe_operations',
    description: 'Returns the machine-readable operation list for the OpenClaw skill adapter.',
    input_summary: 'No input object is required.'
  },
  {
    name: '/ingest',
    description: 'Preferred OpenClaw shortcut for inserting one or more job URLs into the durable job pool.',
    input_summary: 'Provide url or urls, plus optional title/company/location metadata and an optional storePath.'
  },
  {
    name: '/apply',
    description: 'Preferred OpenClaw shortcut for starting an autonomous run.',
    input_summary: 'Provide count or target_success_count, plus optional runtime/store overrides.'
  },
  {
    name: 'enqueue_posting',
    description: 'Adds one or more pre-eligible job postings to the durable job pool.',
    input_summary: 'Provide jobs and an optional storePath override.'
  },
  {
    name: 'query_job',
    description: 'Looks up one durable job record by job_id.',
    input_summary: 'Provide job_id and an optional storePath override.'
  },
  {
    name: 'start_run',
    description: 'Starts a bounded autonomous run until the target success count is reached or the pool is exhausted.',
    input_summary: 'Provide target_success_count and optional runtime/store overrides.'
  },
  {
    name: 'query_run',
    description: 'Retrieves one run by run_id or lists runs by status.',
    input_summary: 'Provide run_id or a status filter, plus optional run_store_path.'
  },
  {
    name: 'query_ledger',
    description: 'Returns one class of durable ledger records.',
    input_summary: 'Provide kind and an optional storePath override.'
  },
  {
    name: 'query_incidents',
    description: 'Returns active or resolved operational incidents.',
    input_summary: 'Provide optional incident status, limit, and storePath override.'
  }
];
