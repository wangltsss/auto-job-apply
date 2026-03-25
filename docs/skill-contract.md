# OpenClaw Skill Contract

This document defines the skill-facing contract between OpenClaw and this repository.

The contract assumes:
- OpenClaw is the orchestrator
- this repository is the deterministic application runtime
- Playwright MCP is the adopted browser-level MCP transport

## Purpose
The skill contract exists to define:
- which repository operations OpenClaw may call
- which decisions remain owned by OpenClaw
- which behaviors remain owned by the repository runtime
- how repository operations map into a stable skill surface

## Skill Position
The skill surface exposed to OpenClaw is application-specific.

It is responsible for:
- accepting job postings into the job pool
- returning job state
- starting autonomous application runs
- returning run state
- returning ledger state
- returning operational incident state

It is not responsible for:
- replacing Playwright MCP
- exposing free-form browser tools
- giving OpenClaw low-level selector or click control

## Skill Operations

### `enqueue_posting`
Adds one or more postings to the repository job pool.

Input:
- posting URL or normalized posting payload
- optional source metadata

Output:
- inserted count
- duplicate count
- normalized job identities

OpenClaw usage:
- used after manual share or automated discovery
- used only after OpenClaw or the ingestion path has already determined posting eligibility

### `query_job`
Retrieves one posting by `job_id`.

Input:
- `job_id`

Output:
- found or not-found status
- current durable job record

OpenClaw usage:
- inspect current posting state
- confirm whether a job was applied, skipped, retryable, or terminal

### `start_run`
Starts one autonomous run using the repository run controller.

Input:
- target success count
- profile/policy context
- runtime flags such as dry-run, submit gating, and optional session-state path

Output:
- `run_id`
- run status
- success count
- attempt count

OpenClaw usage:
- begin a bounded application session
- request a defined number of successful applications instead of pushing a fixed queue length

### `query_run`
Retrieves one run by `run_id` or lists runs by status.

Input:
- optional `run_id`
- optional run status filter
- optional result limit

Output:
- found or not-found status for single-run query
- run record or run list

OpenClaw usage:
- inspect run completion
- summarize results
- determine whether the pool was exhausted or the target was reached

### `query_ledger`
Retrieves one class of ledger records.

Input:
- attempts, successes, failures, or clarifications

Output:
- matching ledger records

OpenClaw usage:
- build final reports
- surface unresolved clarification items
- inspect provenance and failure records

### `query_incidents`
Retrieves active or resolved operational incidents.

Input:
- optional incident status
- optional result limit

Output:
- matching incident records

OpenClaw usage:
- inspect active host cooldowns
- explain why certain postings were paused
- surface systemic session or site failures in unattended reports

## Expected OpenClaw Behavior
OpenClaw must:
- decide whether a posting is eligible or should be skipped
- decide whether anti-bot or unsupported flows should be abandoned
- provide known applicant facts and inference input
- interpret clarification items and present them to the user
- use skill operations as structured repository calls rather than direct browser-driving instructions

OpenClaw must not:
- issue low-level browser control through this skill surface
- bypass the repository run controller for application-state mutation
- implement its own independent strategic retry loop for the same failed attempt

## Expected Repository Behavior
The repository must:
- accept only structured repository operations through the skill surface
- preserve deterministic runtime execution behind those operations
- maintain durable job, run, and ledger state
- reject unsafe or quarantined answer plans before deterministic execution
- return machine-readable results suitable for OpenClaw reporting

## Relationship To Playwright MCP
Playwright MCP is the adopted browser-level MCP transport.

The skill contract therefore does not expose browser primitives such as:
- open page
- click
- type into selector
- inspect accessibility tree

Those transport concerns belong to Playwright MCP.

This skill contract remains at the repository-application layer:
- postings
- runs
- ledgers
- deterministic application processing

## Result Semantics
Every skill operation must return structured machine-readable results.

Successful results must include:
- operation identity
- operation-specific payload
- stable identifiers such as `job_id` or `run_id` where applicable

Failure results must include:
- stable failure code
- message
- structured details object

## Stop Conditions
OpenClaw is expected to stop or avoid invoking run execution when:
- the posting is ineligible
- anti-bot or unsupported workflows are present
- the user’s policy forbids continuation

The repository is expected to stop processing when:
- the answer plan is quarantined or not eligible
- deterministic execution fails terminally
- the run target has been reached
- the pool is exhausted

## Completion Criteria
The skill contract is complete when:
- the skill operations are frozen
- request and response shapes are documented
- OpenClaw can rely on the contract without referring to internal commands
- Playwright MCP and repository-level operations are clearly separated
