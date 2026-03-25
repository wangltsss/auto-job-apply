import { readFile } from 'node:fs/promises';
import { buildOpenClawPrompt } from './promptTemplate.js';
import { parseAndValidateAnswerPlan } from './parseAnswerPlan.js';
import { runOpenClaw } from './runOpenClaw.js';
import { writeAnswerPlanArtifact } from './writeAnswerPlanArtifact.js';
import { DEFAULT_POLICY_FLAGS, buildReasoningInput, readExtractedFormArtifact } from './buildReasoningInput.js';
import { ReasoningBridgeError } from './errors.js';
import { enforceAnswerPlanPolicy } from './enforceAnswerPlanPolicy.js';
import type {
  ApplicantProfile,
  OpenClawRunnerOptions,
  ReasoningPolicyFlags,
  ReasoningBridgeFailure,
  ReasoningBridgeResult,
  ReasoningBridgeSuccess
} from './types.js';

export interface RunReasoningBridgeOptions {
  extractedFormArtifactPath: string;
  applicantProfile: ApplicantProfile;
  policyFlags?: Partial<ReasoningPolicyFlags>;
  openClaw?: OpenClawRunnerOptions;
  mockOpenClawRawOutputPath?: string;
}

export async function runReasoningBridge(options: RunReasoningBridgeOptions): Promise<ReasoningBridgeSuccess> {
  const extractedForm = await readExtractedFormArtifact(options.extractedFormArtifactPath);
  const policyFlags = { ...DEFAULT_POLICY_FLAGS, ...options.policyFlags };
  const reasoningInput = buildReasoningInput({
    extractedForm,
    applicantProfile: options.applicantProfile,
    policyFlags
  });

  const prompt = buildOpenClawPrompt(reasoningInput);

  const rawOpenClawOutput = options.mockOpenClawRawOutputPath
    ? await readFile(options.mockOpenClawRawOutputPath, 'utf-8')
    : (await runOpenClaw(prompt, options.openClaw)).stdout;

  const parsedAnswerPlan = parseAndValidateAnswerPlan(rawOpenClawOutput);
  const answerPlan = enforceAnswerPlanPolicy(parsedAnswerPlan, policyFlags);
  const answerPlanPath = await writeAnswerPlanArtifact(answerPlan);

  return {
    status: 'success',
    answerPlan,
    answerPlanPath,
    prompt,
    rawOpenClawOutput
  };
}

export async function runReasoningBridgeSafe(options: RunReasoningBridgeOptions): Promise<ReasoningBridgeResult> {
  try {
    return await runReasoningBridge(options);
  } catch (error) {
    if (error instanceof ReasoningBridgeError) {
      const failure: ReasoningBridgeFailure = {
        status: 'error',
        code: error.code,
        message: error.message,
        details: error.details
      };
      return failure;
    }

    const fallback: ReasoningBridgeFailure = {
      status: 'error',
      code: 'openclaw_invocation_failure',
      message: 'Unexpected reasoning bridge failure',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
    return fallback;
  }
}

export { buildReasoningInput, DEFAULT_POLICY_FLAGS, readExtractedFormArtifact } from './buildReasoningInput.js';
export { enforceAnswerPlanPolicy } from './enforceAnswerPlanPolicy.js';
export { buildOpenClawPrompt } from './promptTemplate.js';
export { parseAndValidateAnswerPlan } from './parseAnswerPlan.js';
export { buildOpenClawInvocation, runOpenClaw } from './runOpenClaw.js';
export { writeAnswerPlanArtifact } from './writeAnswerPlanArtifact.js';
export { ReasoningBridgeError } from './errors.js';
export type {
  ApplicantProfile,
  OpenClawRunResult,
  OpenClawRunnerOptions,
  ReasoningBridgeFailure,
  ReasoningBridgeFailureCode,
  ReasoningBridgeResult,
  ReasoningBridgeSuccess,
  ReasoningInput,
  ReasoningPolicyFlags
} from './types.js';
