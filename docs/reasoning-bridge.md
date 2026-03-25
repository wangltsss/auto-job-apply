# Reasoning Bridge

The reasoning bridge is the strict middle layer between scraper output and future deterministic browser execution.

## Flow
1. Read extracted form artifact (`artifacts/forms/*.json`).
2. Build compact reasoning payload (`ReasoningInput`) with policy flags + applicant profile.
3. Build JSON-only prompt for OpenClaw.
4. Invoke OpenClaw CLI and capture raw output.
5. Parse JSON object from raw output.
6. Validate against `AnswerPlan` contract.
7. Enforce runtime confidence policy against the validated plan.
8. Write the normalized answer-plan artifact to `artifacts/answer-plans/<timestamp>_<page-token>.json`.

## Modules
- `reasoning/buildReasoningInput.ts`: normalize extracted form + profile + policies
- `reasoning/promptTemplate.ts`: strict prompt builder
- `reasoning/runOpenClaw.ts`: CLI invocation
- `reasoning/parseAnswerPlan.ts`: JSON extraction + schema validation
- `reasoning/enforceAnswerPlanPolicy.ts`: confidence-threshold and clarification gating
- `reasoning/writeAnswerPlanArtifact.ts`: answer-plan artifact writer
- `reasoning/index.ts`: orchestration entrypoint with safe/unsafe variants

## Failure codes
- `missing_extracted_form_artifact`
- `invalid_extracted_form_artifact`
- `openclaw_invocation_failure`
- `malformed_openclaw_json`
- `answer_plan_schema_validation_failed`
- `answer_plan_policy_enforcement_failed`

## Reasoning contract details
By default, the bridge invokes OpenClaw through:
- `openclaw agent --local --agent <id> --message <prompt>`

Default routing resolution order is:
- `openClaw.agent`
- `OPENCLAW_AGENT_ID`
- `openClaw.sessionId`
- `OPENCLAW_SESSION_ID`
- `openClaw.to`
- `OPENCLAW_TO`

If no routing value is available, the bridge fails before spawn with `openclaw_invocation_failure`.

The bridge now requires OpenClaw to emit answer provenance on every answer item:
- `known_profile`
- `clawdbot_inferred`
- `user_clarification_required`

The bridge also supplies explicit confidence thresholds through policy flags:
- `minimum_known_profile_confidence`
- `minimum_inferred_confidence`

When `submit_only_if_safe` is enabled, the bridge converts otherwise-valid answer plans to `quarantine` if confidence or clarification requirements do not satisfy runtime policy.

## Mocked local run
```bash
npm run example:answer-plan
```

Custom files:
```bash
npm run example:answer-plan -- ./artifacts/forms/<file>.json ./examples/fixtures/valid-openclaw-response.json
```

The default example uses a mock OpenClaw response fixture so you can test the bridge without a live model call.
