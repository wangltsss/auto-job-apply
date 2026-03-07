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
