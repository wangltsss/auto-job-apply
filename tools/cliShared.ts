import { ExecutorError } from '../executor/errors.js';
import { OrchestrationError } from '../orchestration/errors.js';
import { ReasoningBridgeError } from '../reasoning/errors.js';
import { pathToFileURL } from 'node:url';

export type ToolStage = 'scrape' | 'answer_plan' | 'execute' | 'pipeline';

export interface ToolSuccessEnvelope {
  ok: true;
  stage: ToolStage;
  status: 'success';
  artifact_paths: {
    scrape_artifact_path?: string | null;
    answer_plan_artifact_path?: string | null;
    execution_result_artifact_path?: string | null;
    pipeline_artifact_path?: string | null;
  };
  result: Record<string, unknown>;
}

export interface ToolFailureEnvelope {
  ok: false;
  stage: ToolStage;
  code: string;
  error: string;
  details: Record<string, unknown>;
}

export function hasHelpFlag(argv: string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

export function writeJsonLine(payload: unknown, stream: NodeJS.WriteStream): void {
  stream.write(`${JSON.stringify(payload)}\n`);
}

export function isDirectExecution(metaUrl: string, argvEntry: string | undefined): boolean {
  if (!argvEntry) {
    return false;
  }

  return metaUrl === pathToFileURL(argvEntry).href;
}

export function buildSuccessEnvelope(
  stage: ToolStage,
  artifactPaths: ToolSuccessEnvelope['artifact_paths'],
  result: Record<string, unknown>
): ToolSuccessEnvelope {
  return {
    ok: true,
    stage,
    status: 'success',
    artifact_paths: artifactPaths,
    result
  };
}

export function buildFailureEnvelope(error: unknown, stage: ToolStage): ToolFailureEnvelope {
  if (error instanceof OrchestrationError) {
    return {
      ok: false,
      stage,
      code: error.code,
      error: error.message,
      details: {
        stage: error.stage,
        ...error.details
      }
    };
  }

  if (error instanceof ReasoningBridgeError) {
    return {
      ok: false,
      stage,
      code: error.code,
      error: error.message,
      details: { ...error.details }
    };
  }

  if (error instanceof ExecutorError) {
    return {
      ok: false,
      stage,
      code: error.code,
      error: error.message,
      details: {
        field_id: error.fieldId,
        ...error.details
      }
    };
  }

  return {
    ok: false,
    stage,
    code: 'cli_error',
    error: error instanceof Error ? error.message : String(error),
    details: {}
  };
}
