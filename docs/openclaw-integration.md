# OpenClaw Integration Surface

This repository is intended to be used from OpenClaw through a skill-backed MCP integration surface.

## MCP Position
The repository keeps deterministic execution, queue state, and ledger state inside its own modules.
MCP is the external protocol layer used to expose those modules as structured tool operations.

## Skill model
OpenClaw is the orchestrator.
The repository is the deterministic runtime and stateful backend exposed to OpenClaw through MCP-compatible tool operations.

The skill surface includes:
- scraping operations
- answer-plan generation operations
- deterministic execution operations
- job-pool operations
- ledger operations
- pipeline operations

## Internal command surface
The repository implements the skill and MCP layer with local tool commands.
Those commands are internal runtime entrypoints rather than the primary user interface.

- `npm run tool:scrape -- --url <job_url> [--storage-state <path>] [--headed] [--no-trace]`
- `npm run tool:answer-plan -- --form-artifact <path> [--profile <path>] [--mock-response <path>]`
- `npm run tool:execute -- --form-artifact <path> --answer-plan-artifact <path> [--storage-state <path>] [--headed] [--submit] [--cdp-endpoint <url>] [--mock]`
- `npm run tool:job-pool -- ingest (--url <job_url> | --input-file <path>) [--source-type manual|automated] [--store-path <path>]`
- `npm run tool:job-pool -- list [--status <status>] [--source-type manual|automated] [--limit <n>] [--store-path <path>]`
- `npm run tool:pipeline -- --url <job_url> [--mode scrape|scrape-answer-plan|full] [--storage-state <path>] [--headed] [--mock-response <path>] [--mock-execution]`

## Stdout contract
- Success: JSON object written to stdout with `ok: true`, `stage`, `status`, `artifact_paths`, and `result`.
- Failure: JSON object written to stderr with `ok: false`, `stage`, `code`, `error`, and `details`.
- Exit code is non-zero on failure.

## Usage in OpenClaw
From the user perspective, the expected flow is:
- install or register the skill with OpenClaw
- let OpenClaw discover the skill
- invoke the skill through OpenClaw prompts or task orchestration
- allow OpenClaw to call the exposed MCP operations as needed

## Before autonomous submit
- Keep `--submit` explicit and gated.
- Continue requiring policy-valid answer plans and successful dry-run verification.

## Demo scripts
The `example:*` package scripts are development demos.
