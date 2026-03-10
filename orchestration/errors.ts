import type { PipelineStage } from './types.js';

export class OrchestrationError extends Error {
  code: string;
  stage: PipelineStage | null;
  details: Record<string, unknown>;

  constructor(code: string, message: string, stage: PipelineStage | null = null, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'OrchestrationError';
    this.code = code;
    this.stage = stage;
    this.details = details;
  }
}
