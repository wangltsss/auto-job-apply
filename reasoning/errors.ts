import type { ReasoningBridgeFailureCode } from './types.js';

export class ReasoningBridgeError extends Error {
  code: ReasoningBridgeFailureCode;
  details: Record<string, unknown>;

  constructor(code: ReasoningBridgeFailureCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ReasoningBridgeError';
    this.code = code;
    this.details = details;
  }
}
