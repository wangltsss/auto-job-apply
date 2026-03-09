# Executor CLI

The executor consumes two validated artifacts:
1. Extracted form artifact (`artifacts/forms/*.json`)
2. Answer plan artifact (`artifacts/answer-plans/*.json`)

It deterministically applies actions and records execution results.

## Design principles
- No reasoning or answer generation.
- Strict handler dispatch by `answer_type`.
- Deterministic field resolution precedence (`selector_hint` -> `id_attr` -> `name_attr` -> `aria_label` -> label fallback).
- Explicit failure codes for critical errors.

## Main modules
- `executor/loadExecutionInputs.ts`
- `executor/fieldResolvers.ts`
- `executor/applyScalar.ts`
- `executor/applyOption.ts`
- `executor/applyMultiSelect.ts`
- `executor/applyFileAction.ts`
- `executor/applySkip.ts`
- `executor/verifyFieldState.ts`
- `executor/verifyReadyToSubmit.ts`
- `executor/submitFlow.ts`
- `executor/writeExecutionArtifact.ts`
- `executor/index.ts`

## Failure codes
- `field_not_found`
- `locator_resolution_failed`
- `unsupported_field_type`
- `verification_failed`
- `upload_failed`
- `submit_blocked_by_policy`
- `submit_failed`

## CLI example
Mocked dry-run (default):
```bash
npm run executor
```

Real Playwright session (requires live reachable page and optional auth state):
```bash
npm run executor -- ./artifacts/forms/<form>.json ./artifacts/answer-plans/<plan>.json --real
```

Attempt submit explicitly:
```bash
npm run executor -- ./artifacts/forms/<form>.json ./artifacts/answer-plans/<plan>.json --real --submit
```
