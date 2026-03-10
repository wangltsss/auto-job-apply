import { runReasoningBridgeSafe } from '../reasoning/index.js';
import { OrchestrationError } from './errors.js';
import type { RunAnswerPlanOptions, AnswerPlanStageOutput } from './types.js';

export async function runAnswerPlan(options: RunAnswerPlanOptions): Promise<AnswerPlanStageOutput> {
  const result = await runReasoningBridgeSafe({
    extractedFormArtifactPath: options.extractedFormArtifactPath,
    applicantProfile: options.applicantProfile ?? {},
    policyFlags: options.policyFlags,
    mockOpenClawRawOutputPath: options.mockOpenClawRawOutputPath
  });

  if (result.status === 'error') {
    throw new OrchestrationError(result.code, result.message, 'answer_plan', result.details);
  }

  return {
    stage: 'answer_plan',
    answerPlanArtifactPath: result.answerPlanPath,
    answerPlanStatus: result.answerPlan.status
  };
}
