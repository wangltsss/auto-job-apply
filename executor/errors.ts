import type { ExecutionFailureCode } from './types.js';

export class ExecutorError extends Error {
  code: ExecutionFailureCode;
  fieldId: string | null;
  details: Record<string, unknown>;

  constructor(code: ExecutionFailureCode, message: string, fieldId: string | null = null, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ExecutorError';
    this.code = code;
    this.fieldId = fieldId;
    this.details = details;
  }
}
