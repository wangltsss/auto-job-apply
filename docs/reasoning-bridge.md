# Reasoning Bridge

The reasoning bridge is the strict middle layer between scraper output and future deterministic browser execution.

## Flow
1. Read extracted form artifact (`artifacts/forms/*.json`).
2. Build compact reasoning payload (`ReasoningInput`) with policy flags + applicant profile.
3. Build JSON-only prompt for OpenClaw.
4. Invoke OpenClaw CLI and capture raw output.
5. Parse JSON object from raw output.
6. Validate against `AnswerPlan` contract.
7. Write artifact to `artifacts/answer-plans/<timestamp>_<page-token>.json`.

## Modules
- `reasoning/buildReasoningInput.ts`: normalize extracted form + profile + policies
- `reasoning/promptTemplate.ts`: strict prompt builder
- `reasoning/runOpenClaw.ts`: CLI invocation
- `reasoning/parseAnswerPlan.ts`: JSON extraction + schema validation
- `reasoning/writeAnswerPlanArtifact.ts`: answer-plan artifact writer
- `reasoning/index.ts`: orchestration entrypoint with safe/unsafe variants

## Failure codes
- `missing_extracted_form_artifact`
- `invalid_extracted_form_artifact`
- `openclaw_invocation_failure`
- `malformed_openclaw_json`
- `answer_plan_schema_validation_failed`

## Mocked local run
```bash
npm run example:answer-plan
```

Custom files:
```bash
npm run example:answer-plan -- ./artifacts/forms/<file>.json ./examples/fixtures/valid-openclaw-response.json
```

The default example uses a mock OpenClaw response fixture so you can test the bridge without a live model call.
