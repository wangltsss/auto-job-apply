import { nowIso } from '../playwright/utils/text.js';
import { OrchestrationError } from './errors.js';
import { runAnswerPlan } from './runAnswerPlan.js';
import { runExecution } from './runExecution.js';
import { runScrape } from './runScrape.js';
import type { OrchestrationDeps, PipelineRunArtifact, PipelineRunOptions, PipelineRunResult, PipelineStage } from './types.js';
import { writePipelineArtifact } from './writePipelineArtifact.js';

export async function runPipeline(options: PipelineRunOptions, deps: Partial<OrchestrationDeps> = {}): Promise<PipelineRunResult> {
  const startedAt = nowIso();
  const mode = options.mode ?? 'full';
  const stagesRun: PipelineStage[] = [];
  let scrapeArtifactPath: string | null = null;
  let answerPlanArtifactPath: string | null = null;
  let executionResultArtifactPath: string | null = null;
  let failureStage: PipelineStage | null = null;
  let failureCode: string | null = null;
  const notes: string[] = [];

  const scrapeRunner = deps.runScrape ?? runScrape;
  const answerPlanRunner = deps.runAnswerPlan ?? runAnswerPlan;
  const executionRunner = deps.runExecution ?? runExecution;

  try {
    const scrapeOut = await scrapeRunner({
      url: options.url,
      storageStatePath: options.storageStatePath,
      headless: options.headless,
      traceEnabled: options.traceEnabled,
      timeoutMs: options.timeoutMs
    });
    scrapeArtifactPath = scrapeOut.scrapeArtifactPath;
    stagesRun.push('scrape');

    if (mode === 'scrape') {
      notes.push('Pipeline stopped after scrape stage by mode configuration.');
      return await finalize('success');
    }

    const answerOut = await answerPlanRunner({
      extractedFormArtifactPath: scrapeArtifactPath,
      applicantProfile: options.applicantProfile,
      policyFlags: options.policyFlags,
      mockOpenClawRawOutputPath: options.mockOpenClawRawOutputPath
    });
    answerPlanArtifactPath = answerOut.answerPlanArtifactPath;
    stagesRun.push('answer_plan');

    if (mode === 'scrape-answer-plan') {
      notes.push('Pipeline stopped after answer-plan stage by mode configuration.');
      return await finalize('success');
    }

    const execOut = await executionRunner({
      extractedFormArtifactPath: scrapeArtifactPath,
      answerPlanArtifactPath,
      storageStatePath: options.storageStatePath,
      headless: options.headless,
      dryRun: options.dryRun ?? true,
      submit: options.submit ?? false,
      traceEnabled: options.traceEnabled,
      cdpEndpoint: options.cdpEndpoint,
      mockMode: options.mockExecution ?? false
    });
    executionResultArtifactPath = execOut.executionResultArtifactPath;
    stagesRun.push('execute');

    return await finalize('success');
  } catch (error) {
    if (error instanceof OrchestrationError) {
      failureStage = error.stage;
      failureCode = error.code;
      notes.push(`${error.code}: ${error.message}`);
      notes.push(JSON.stringify(error.details));
    } else if (isPipelineErrorLike(error)) {
      failureStage = error.stage;
      failureCode = error.code;
      notes.push(`${error.code}: ${error.message}`);
      notes.push(JSON.stringify(error.details ?? {}));
    } else {
      failureStage = failureStage ?? null;
      failureCode = 'pipeline_unexpected_failure';
      notes.push(`pipeline_unexpected_failure: ${error instanceof Error ? error.message : String(error)}`);
    }

    return await finalize('error');
  }

  async function finalize(finalStatus: 'success' | 'error'): Promise<PipelineRunResult> {
    const artifact: PipelineRunArtifact = {
      started_at: startedAt,
      ended_at: nowIso(),
      input_url: options.url,
      stages_run: stagesRun,
      scrape_artifact_path: scrapeArtifactPath,
      answer_plan_artifact_path: answerPlanArtifactPath,
      execution_result_artifact_path: executionResultArtifactPath,
      final_status: finalStatus,
      failure_stage: failureStage,
      failure_code: failureCode,
      notes
    };

    const pipelineArtifactPath = await writePipelineArtifact(artifact);
    return { pipelineArtifactPath, artifact };
  }
}

function isPipelineErrorLike(error: unknown): error is {
  code: string;
  stage: PipelineStage;
  message: string;
  details?: unknown;
} {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const stage = candidate.stage;
  const code = candidate.code;
  const message = candidate.message;

  if (typeof code !== 'string' || typeof message !== 'string') {
    return false;
  }
  return stage === 'scrape' || stage === 'answer_plan' || stage === 'execute';
}
