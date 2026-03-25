# Run Controller

The run controller is the pool-backed execution loop for autonomous application runs.

## Responsibilities
- create a durable run record
- claim one job at a time from the job pool
- invoke the deterministic per-job pipeline
- increment run success count only on successful application completion
- schedule bounded strategic retries for retryable failures
- terminate the run when the target success count is reached or the pool is exhausted
- prevent duplicate concurrent runs on the same workspace store

## Current Runtime Model
The current implementation is a single-process controller with one active run at a time.

Job claiming uses durable pool state:
- `queued` jobs are immediately claimable
- `failed_retryable` jobs become claimable when `next_attempt_at` has been reached
- `attempting` jobs are reserved to the active run until they are finalized

Run state is written to:
- `artifacts/run-controller/runs.json`

Active-run exclusion is enforced by:
- `artifacts/run-controller/active-run.lock`

## Retry Policy
The initial strategic retry policy is:
- maximum attempts per job: `3`
- second attempt: immediate
- third attempt: `5` minute delay
- exhausted retries finalize the job as `failed_terminal`

Retry classification is driven by concrete pipeline failure codes as defined in the formal design document.

## Result Model
Each run record stores:
- run identity and timestamps
- target success count
- current success count
- total strategic attempt count
- retry policy
- per-attempt results including failure code, failure category, retryability, and next retry time

Each finalized job stores:
- attempt count
- last failure code
- next retry timestamp, when applicable
- last pipeline artifact path
- applied timestamp, when successful
