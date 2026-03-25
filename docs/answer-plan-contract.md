# Answer Plan Contract

This contract defines the output of the reasoning layer (LLM/OpenClaw) after it analyzes an extracted form artifact.

## Pipeline position
1. Scraper produces normalized extracted form JSON.
2. OpenClaw/LLM consumes extracted form + applicant profile and emits an `AnswerPlan`.
3. Deterministic executor (future module) consumes `AnswerPlan` and performs browser actions.

## Why this exists
- Separates reasoning from browser execution.
- Encodes risk and ambiguity explicitly.
- Provides a strict machine-readable contract for allow/block decisions.

## Core fields
- `status`: `proceed | quarantine | not_eligible`
- `reason`: short status rationale
- `ats`: source ATS context
- `application_url`: target application URL
- `submit_allowed`: hard gate for executor behavior
- `answers[]`: proposed answers by `field_id`
- `ambiguous_fields[]`: unresolved high-risk or unclear items
- `notes[]`: execution-oriented notes

## Answer provenance
Every answer item must declare its provenance:
- `known_profile`: directly supported by applicant facts already known to OpenClaw
- `clawdbot_inferred`: inferred by OpenClaw from known applicant context
- `user_clarification_required`: not safe for autonomous submission without clarification

If provenance is `user_clarification_required`, `requires_human_review` must be `true`.

## Confidence policy
The reasoning bridge provides explicit confidence thresholds to OpenClaw through policy flags:
- `minimum_known_profile_confidence`
- `minimum_inferred_confidence`

If `submit_only_if_safe` is enabled, the runtime quarantines answer plans containing:
- any answer marked `requires_human_review`
- any `known_profile` answer below `minimum_known_profile_confidence`
- any `clawdbot_inferred` answer below `minimum_inferred_confidence`

## Answer item types
- `scalar`: freeform scalar (`string | number | boolean`)
- `option`: single option selection (`string`)
- `multi_select`: multiple selections (`string[]`)
- `file_action`: file operation (`upload | skip` with path and kind)
- `skip`: explicit unanswered decision (`value = null`)

## Validation assets
- JSON schema: `playwright/schemas/answer-plan.schema.json`
- TypeScript types: `playwright/schemas/answerPlanTypes.ts`
- Runtime validator: `playwright/schemas/answerPlanValidators.ts`
- Examples: `examples/answer-plans/*.answer-plan.json`
