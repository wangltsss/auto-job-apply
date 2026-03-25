# Executor CLI

The executor consumes two validated artifacts:
1. Extracted form artifact (`artifacts/forms/*.json`)
2. Answer plan artifact (`artifacts/answer-plans/*.json`)

It deterministically applies actions and records execution results.
It also appends durable attempt/success/failure records to the application ledger.

## Design principles
- No reasoning or answer generation.
- Strict handler dispatch by `answer_type`.
- Deterministic field resolution precedence (`selector_hint` -> `id_attr` -> `name_attr` -> `aria_label` -> label fallback).
- Explicit failure codes for critical errors.
- Dry-run is the default execution mode.

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
- `navigation_failed`
- `session_state_invalid`
- `live_field_not_found`
- `live_verification_failed`
- `upload_widget_bind_failed`
- `submit_blocked_by_policy`
- `submit_failed`

## CLI example
Real Greenhouse dry-run:
```bash
npm run example:executor -- ./artifacts/forms/<form>.json ./artifacts/answer-plans/<plan>.json --storage-state ./state/linkedin.json --headed
```

Mocked dry-run:
```bash
npm run example:executor -- --mock
```

Real run with explicit submit attempt:
```bash
npm run example:executor -- ./artifacts/forms/<form>.json ./artifacts/answer-plans/<plan>.json --storage-state ./state/linkedin.json --submit
```

## Ledger output
Executor runs append records to:
- `artifacts/application-ledger/ledger.json`

The ledger stores:
- execution attempts
- successful applications
- failed attempts
- answer summaries with provenance classes
- unresolved clarification items for future user input
