import type { ExtractedFormResult, ScrapeOptions } from '../playwright/schemas/types.js';
import type { ApplicantProfile, ReasoningPolicyFlags } from '../reasoning/types.js';

export type PipelineMode = 'scrape' | 'scrape-answer-plan' | 'full';
export type PipelineStage = 'scrape' | 'answer_plan' | 'execute';

export interface RunScrapeOptions {
  url: string;
  storageStatePath?: string;
  headless?: boolean;
  traceEnabled?: boolean;
  timeoutMs?: number;
}

export interface RunAnswerPlanOptions {
  extractedFormArtifactPath: string;
  applicantProfile?: ApplicantProfile;
  policyFlags?: Partial<ReasoningPolicyFlags>;
  mockOpenClawRawOutputPath?: string;
}

export interface RunExecutionOptions {
  extractedFormArtifactPath: string;
  answerPlanArtifactPath: string;
  jobId?: string;
  ledgerStorePath?: string;
  storageStatePath?: string;
  headless?: boolean;
  dryRun?: boolean;
  submit?: boolean;
  traceEnabled?: boolean;
  cdpEndpoint?: string;
  mockMode?: boolean;
}

export interface PipelineRunOptions {
  mode?: PipelineMode;
  url: string;
  jobId?: string;
  ledgerStorePath?: string;
  storageStatePath?: string;
  headless?: boolean;
  traceEnabled?: boolean;
  timeoutMs?: number;
  applicantProfile?: ApplicantProfile;
  policyFlags?: Partial<ReasoningPolicyFlags>;
  mockOpenClawRawOutputPath?: string;
  dryRun?: boolean;
  submit?: boolean;
  cdpEndpoint?: string;
  mockExecution?: boolean;
}

export interface ScrapeStageOutput {
  stage: 'scrape';
  scrapeArtifactPath: string;
  scrapeResult: ExtractedFormResult;
}

export interface AnswerPlanStageOutput {
  stage: 'answer_plan';
  answerPlanArtifactPath: string;
  answerPlanStatus: 'proceed' | 'quarantine' | 'not_eligible';
}

export interface ExecutionStageOutput {
  stage: 'execute';
  executionResultArtifactPath: string;
  executionStatus: 'success' | 'error';
}

export interface PipelineRunArtifact {
  started_at: string;
  ended_at: string;
  job_id: string | null;
  input_url: string;
  stages_run: PipelineStage[];
  scrape_artifact_path: string | null;
  answer_plan_artifact_path: string | null;
  answer_plan_status: 'proceed' | 'quarantine' | 'not_eligible' | null;
  execution_result_artifact_path: string | null;
  final_status: 'success' | 'error';
  failure_stage: PipelineStage | null;
  failure_code: string | null;
  notes: string[];
}

export interface PipelineRunResult {
  pipelineArtifactPath: string;
  artifact: PipelineRunArtifact;
}

export interface OrchestrationDeps {
  runScrape: (options: RunScrapeOptions) => Promise<ScrapeStageOutput>;
  runAnswerPlan: (options: RunAnswerPlanOptions) => Promise<AnswerPlanStageOutput>;
  runExecution: (options: RunExecutionOptions) => Promise<ExecutionStageOutput>;
}

export type ScrapeToolInput = Pick<ScrapeOptions, 'url' | 'storageStatePath' | 'headless' | 'traceEnabled' | 'timeoutMs'>;
