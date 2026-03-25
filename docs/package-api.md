# Package API

This document defines the package-facing API surface for this repository.

The package API is the stable programmatic boundary for consumers that integrate this repository as an application runtime rather than invoking internal source modules directly.

## Purpose
The package API exists to:
- provide a stable entrypoint for published consumption
- prevent external consumers from binding directly to internal module layout
- align the package surface with the OpenClaw skill surface
- preserve deterministic runtime semantics behind a narrow external interface

## Scope
The package API exposes repository-level operations for:
- job ingestion
- job querying
- run start and run querying
- ledger querying
- incident querying

The package API does not expose:
- free-form browser-control primitives
- selector-level operations
- low-level Playwright interaction helpers
- internal store mutation helpers as public contracts

Browser-level MCP transport is delegated to Playwright MCP rather than this package API.

## Public Entry Point
The package root entry point is:
- [index.ts](../index.ts)

The published package surface is defined in terms of stable service-level operations rather than raw module namespace exports.

The stable service-level exports are:
- `enqueueJob`
- `queryJob`
- `startRun`
- `queryRun`
- `queryLedger`
- `queryIncidents`

## Public Operations

### `enqueueJob`
Adds one or more postings to the job pool.

Input:
- one or more normalized or ingestible posting records
- optional job-pool store path override

Output:
- inserted job count
- duplicate job count
- normalized job identities and statuses
- resolved job-pool store path

Behavior:
- normalizes incoming postings
- deduplicates against existing pool entries
- persists the durable job-pool state

### `queryJob`
Returns one job record by `job_id`.

Input:
- `job_id`
- optional job-pool store path override

Output:
- found or not-found status
- full job record when found

Behavior:
- performs a read-only lookup against the durable job pool

### `startRun`
Starts one autonomous run against the job pool.

Input:
- target success count
- optional job-pool, run-store, ledger-store, and lock-path overrides
- applicant profile input
- optional reasoning mock-response path
- runtime execution flags such as dry-run, submit, and storage-state path

Output:
- `run_id`
- run status
- target success count
- achieved success count
- attempt count
- run-store path

Behavior:
- creates a durable run record
- claims jobs from the pool
- invokes the deterministic runtime
- applies bounded strategic retries
- terminates on target-success completion or pool exhaustion

### `queryRun`
Returns one run record or a filtered set of run records.

Input:
- optional `run_id`
- optional `status`
- optional `limit`
- optional run-store path override

Output:
- found or not-found status for single-run query
- full run record when found
- filtered run list for collection query

Behavior:
- performs read-only lookup against the durable run store

### `queryLedger`
Returns one class of ledger records.

Input:
- record kind:
  - attempts
  - successes
  - failures
  - clarifications
- optional ledger-store path override

Output:
- record count
- matching ledger records

Behavior:
- performs read-only lookup against the durable application ledger

### `queryIncidents`
Returns active or resolved operational incidents.

Input:
- optional incident `status`
- optional `limit`
- optional incident-store path override

Output:
- incident count
- matching incident records

Behavior:
- performs read-only lookup against the durable incident store

## External Result Shape
Published package operations must preserve the same high-level result semantics as the skill/tool surface:
- machine-readable success results
- machine-readable failure results
- stable operation names
- deterministic side-effect boundaries

The package API should standardize on:
- successful result objects with operation-specific payloads
- structured failures containing:
  - error code
  - error message
  - structured details object

## Stability Rules
The following are package-stable:
- public operation names
- public input object shapes
- public result object shapes
- documented failure code names where exposed externally

The following are not package-stable:
- internal file/module layout
- internal helper functions
- internal store representations beyond documented contract fields
- internal CLI parsing details

## Relationship To Internal Commands
The current `tool:*` commands are implementation-level entrypoints for local execution and MCP/skill wrapping.

They are not the package API itself.

The package API exists above those commands as the programmatic contract for external consumers.

## Relationship To The Skill Adapter
The skill adapter is the executable bridge that maps OpenClaw-side skill calls onto this package API.

The adapter is implemented by:
- [skill-adapter/index.ts](../skill-adapter/index.ts)
- [tools/skill-cli.ts](../tools/skill-cli.ts)

The package API remains the stable programmatic layer beneath that adapter.

## Relationship To Playwright MCP
Playwright MCP provides browser-level MCP transport.

This package provides application-specific orchestration and state operations on top of that transport:
- job pool
- reasoning contract handling
- deterministic execution orchestration
- application ledger
- run controller

## Completion Criteria
The package API is complete when:
- stable service-level exports exist for the public operations
- the public input and output contracts are documented
- contract tests verify those operations
- external consumers no longer need to depend on internal module namespaces
