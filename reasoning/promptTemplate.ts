import type { ReasoningInput } from './types.js';

export function buildOpenClawPrompt(input: ReasoningInput): string {
  const reasoningJson = JSON.stringify(input, null, 2);

  return [
    'You are OpenClaw acting as a strict answer-plan generator.',
    'Return ONLY one valid JSON object matching the AnswerPlan contract.',
    'Do not return markdown, commentary, explanations, or surrounding prose.',
    'Do not invent fields that are not present in input.fields[].',
    'Every answer item must reference an existing field_id from input.fields[].',
    'If a field is ambiguous, risky, legal, compensation-related, or lacks reliable evidence, do not guess.',
    'Instead, use answer_type="skip" where needed and populate ambiguous_fields[].',
    'Demographic questions must be skipped by default unless policy allows otherwise.',
    'If unresolved ambiguity/risk exists, status must be "quarantine" and submit_allowed must be false.',
    'If applicant is not eligible, status must be "not_eligible" and submit_allowed must be false.',
    'Use "proceed" only when the plan is safe and deterministic under the given policy flags.',
    'AnswerPlan shape required:',
    '{"status","reason","ats","application_url","submit_allowed","answers","ambiguous_fields","notes","generated_at"}',
    'Allowed answer_type values: scalar, option, multi_select, file_action, skip.',
    'Every answer must include provenance as one of: known_profile, clawdbot_inferred, user_clarification_required.',
    'For file_action, value must include action, file_path, file_kind.',
    'Confidence must be between 0 and 1 for every answer.',
    'If provenance is user_clarification_required, requires_human_review must be true.',
    'Honor policy_flags.minimum_known_profile_confidence and policy_flags.minimum_inferred_confidence when deciding whether status can be proceed.',
    '',
    'INPUT_JSON:',
    reasoningJson
  ].join('\n');
}
