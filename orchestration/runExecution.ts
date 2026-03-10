import { runExecutor } from '../executor/index.js';
import { OrchestrationError } from './errors.js';
import type { ExecutionStageOutput, RunExecutionOptions } from './types.js';

export async function runExecution(options: RunExecutionOptions): Promise<ExecutionStageOutput> {
  const output = await runExecutor(options.extractedFormArtifactPath, options.answerPlanArtifactPath, {
    storageStatePath: options.storageStatePath,
    headless: options.headless,
    dryRun: options.dryRun,
    attemptSubmit: Boolean(options.submit),
    traceEnabled: options.traceEnabled,
    cdpEndpoint: options.cdpEndpoint,
    mockMode: options.mockMode
  });

  if (output.result.status === 'error') {
    throw new OrchestrationError(output.result.failure_code ?? 'execution_failed', 'Execution stage failed', 'execute', {
      executionResultPath: output.artifactPath,
      failedFields: output.result.failed_fields,
      notes: output.result.notes
    });
  }

  return {
    stage: 'execute',
    executionResultArtifactPath: output.artifactPath,
    executionStatus: output.result.status
  };
}
