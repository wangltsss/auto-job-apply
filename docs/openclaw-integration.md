# OpenClaw Integration Surface

This repository is intended to be used from OpenClaw through a skill-backed MCP integration surface.

## MCP Position
The repository keeps deterministic execution, queue state, and ledger state inside its own modules.
MCP is the external protocol layer used to expose those modules as structured tool operations.
Browser-level MCP transport is delegated to Playwright MCP.

## Skill model
OpenClaw is the orchestrator.
The repository is the deterministic runtime and stateful backend exposed to OpenClaw through MCP-compatible tool operations.
Playwright MCP is the adopted browser-level MCP layer used when OpenClaw needs MCP-mediated browser access.

The formal duty boundary between OpenClaw and the runtime is defined in:
- [docs/openclaw-runtime-contract.md](/home/shawn/Documents/auto-apply/docs/openclaw-runtime-contract.md)
- [docs/package-api.md](/home/shawn/Documents/auto-apply/docs/package-api.md)
- [docs/skill-contract.md](/home/shawn/Documents/auto-apply/docs/skill-contract.md)
- [docs/incident-manager.md](/home/shawn/Documents/auto-apply/docs/incident-manager.md)

The skill surface includes:
- scraping operations
- answer-plan generation operations
- deterministic execution operations
- job-pool operations
- ledger operations
- pipeline operations
- run-control operations

Playwright MCP is not a replacement for this repository.
It supplies browser-level MCP transport, while this repository remains responsible for:
- job-pool state
- answer-plan contracts
- deterministic application execution
- application ledger persistence
- run-controller behavior

## Internal command surface
The repository implements the skill and MCP layer with local tool commands.
Those commands are internal runtime entrypoints rather than the primary user interface.

- `npm run tool:scrape -- --url <job_url> [--storage-state <path>] [--headed] [--no-trace]`
- `npm run tool:answer-plan -- --form-artifact <path> [--profile <path>] [--mock-response <path>]`
- `npm run tool:execute -- --form-artifact <path> --answer-plan-artifact <path> [--storage-state <path>] [--headed] [--submit] [--cdp-endpoint <url>] [--mock]`
- `npm run tool:job-pool -- ingest (--url <job_url> | --input-file <path>) [--source-type manual|automated] [--store-path <path>]`
- `npm run tool:job-pool -- list [--status <status>] [--source-type manual|automated] [--limit <n>] [--store-path <path>]`
- `npm run tool:job-pool -- get --job-id <id> [--store-path <path>]`
- `npm run tool:pipeline -- --url <job_url> [--mode scrape|scrape-answer-plan|full] [--storage-state <path>] [--headed] [--mock-response <path>] [--mock-execution]`
- `npm run tool:run -- start-run --target-success-count <n> [--job-pool-path <path>] [--run-store-path <path>] [--profile <path>] [--mock-response <path>] [--mock-execution]`
- `npm run tool:run -- query-run [--run-id <id>] [--status active|completed|exhausted] [--limit <n>] [--run-store-path <path>]`

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
- rely on OpenClaw to make eligibility and anti-bot go/no-go decisions before deterministic execution proceeds

The first stable run-level operations now available for skill/MCP mapping are:
- enqueue posting into the job pool
- query a job by `job_id`
- start a run by target success count
- query a run by `run_id` or filtered run status

## Before autonomous submit
- Keep `--submit` explicit and gated.
- Continue requiring policy-valid answer plans and successful dry-run verification.

## Demo scripts
The `example:*` package scripts are development demos.
