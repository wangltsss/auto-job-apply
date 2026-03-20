# Application Ledger

The application ledger is the durable record of execution attempts and final outcomes.

## Scope
- persist every executor attempt
- persist successful application records
- persist failed attempt records
- attach extracted-form, answer-plan, and execution artifact paths
- preserve answer summaries derived from the validated answer plan

The current implementation is intentionally narrow:
- file-backed JSON store at `artifacts/application-ledger/ledger.json`
- automatic recording during executor runs
- attempt, success, and failure records only

Run control, retries, and job-pool linkage belong to later milestones.

## Record types
- `attempts`
- `successes`
- `failures`

Each record links back to:
- extracted form artifact
- answer plan artifact
- execution result artifact

## Notes
The current answer provenance recorded in the ledger is derived from the validated answer plan:
- `field_id`
- `answer_type`
- `confidence`
- `rationale_short`
- `requires_human_review`

Explicit provenance classes such as `explicit_profile` or `clawdbot_inferred` remain future work.
