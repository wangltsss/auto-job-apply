import type { AnswerPlan, AnswerPlanItem } from '../playwright/schemas/answerPlanTypes.js';
import { ReasoningBridgeError } from './errors.js';
import type { ReasoningPolicyFlags } from './types.js';

function isBelowThreshold(answer: AnswerPlanItem, policyFlags: ReasoningPolicyFlags): boolean {
  if (answer.provenance === 'known_profile') {
    return answer.confidence < policyFlags.minimum_known_profile_confidence;
  }

  if (answer.provenance === 'clawdbot_inferred') {
    return answer.confidence < policyFlags.minimum_inferred_confidence;
  }

  return true;
}

export function enforceAnswerPlanPolicy(answerPlan: AnswerPlan, policyFlags: ReasoningPolicyFlags): AnswerPlan {
  if (
    policyFlags.minimum_known_profile_confidence < 0 ||
    policyFlags.minimum_known_profile_confidence > 1 ||
    policyFlags.minimum_inferred_confidence < 0 ||
    policyFlags.minimum_inferred_confidence > 1
  ) {
    throw new ReasoningBridgeError('answer_plan_policy_enforcement_failed', 'Reasoning policy thresholds must be between 0 and 1', {
      policyFlags
    });
  }

  const unsafeAnswers = answerPlan.answers.filter(
    (answer) => answer.requires_human_review || isBelowThreshold(answer, policyFlags)
  );

  if (!policyFlags.submit_only_if_safe || unsafeAnswers.length === 0) {
    return answerPlan;
  }

  const reasons = unsafeAnswers.map((answer) => {
    if (answer.requires_human_review || answer.provenance === 'user_clarification_required') {
      return `${answer.field_id} requires clarification`;
    }

    if (answer.provenance === 'known_profile') {
      return `${answer.field_id} is below minimum known-profile confidence`;
    }

    return `${answer.field_id} is below minimum inferred confidence`;
  });

  return {
    ...answerPlan,
    status: answerPlan.status === 'not_eligible' ? 'not_eligible' : 'quarantine',
    submit_allowed: false,
    reason:
      answerPlan.status === 'not_eligible'
        ? answerPlan.reason
        : `Runtime policy blocked autonomous submission: ${reasons.join('; ')}.`,
    notes: [
      ...answerPlan.notes,
      `Runtime policy enforced quarantine for ${unsafeAnswers.length} unsafe answer(s).`
    ]
  };
}
