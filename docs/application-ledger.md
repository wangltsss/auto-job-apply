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
- attempt, success, failure, and clarification records

Run control, retries, and job-pool linkage belong to later milestones.

## Record types
- `attempts`
- `successes`
- `failures`
- `clarifications`

Each record links back to:
- extracted form artifact
- answer plan artifact
- execution result artifact

## Notes
The current answer provenance model is:
- `known_profile`
- `clawdbot_inferred`
- `user_clarification_required`

Clarification records are created when an answer is marked as requiring human review.
Those records persist the unresolved question so future user clarification can be captured and reused by later runs.

## Internal query surface
The repository exposes internal ledger operations for:
- listing attempts
- listing successful applications
- listing failures
- listing unresolved clarification items
