# Auto-Apply Pipeline Contracts

OpenClaw skill and deterministic runtime for job-application automation, with Playwright MCP adopted as the browser-level MCP transport.

## Implemented layers
- Scraper/collector layer for extracting ATS application forms
- Reasoning bridge for OpenClaw prompt/run/parse/validate/write
- Deterministic execution runtime for validated answer plans
- Job-pool and application-ledger persistence layers
- Answer Plan contract for reasoning output validation

## Scope
- Opens application pages and extracts normalized form data
- Detects ATS where possible (`greenhouse`, `linkedin_easy_apply`, `unknown`)
- Produces machine-readable JSON artifacts
- Defines strict `AnswerPlan` schema for LLM/OpenClaw output
- Deterministically executes validated answer plans
- Does **not** do new reasoning during execution

## Quick start
1. Install this project as an OpenClaw skill in the environment where OpenClaw runs.
2. Register or expose the repository's MCP tool surface to OpenClaw.
3. In OpenClaw, discover the skill and invoke its job-application operations through the skill interface.
4. Start with non-submitting or dry-run flows before enabling real submission behavior.

## OpenClaw usage
This project is intended to be used through OpenClaw as a skill-backed tool surface.

The user-facing integration model is:
- OpenClaw discovers the skill
- OpenClaw invokes the repository through MCP-compatible operations
- browser-level MCP transport is delegated to Playwright MCP
- the repository executes deterministic scrape, reasoning, execution, job-pool, and ledger modules behind that interface

The local `tool:*` commands are implementation details of the skill runtime and MCP surface. They are not the primary user interface.

The repository now also exposes a package-facing root export at [index.ts](/home/shawn/Documents/auto-apply/index.ts) for stable programmatic use by a future published package surface.

## Contracts
- Extracted form schema: `playwright/schemas/form.schema.json`
- Answer plan schema: `playwright/schemas/answer-plan.schema.json`
- Reasoning fixtures: `examples/fixtures/`

## Docs
- Scraper architecture: `docs/architecture.md`
- Answer plan contract: `docs/answer-plan-contract.md`
- Reasoning bridge: `docs/reasoning-bridge.md`
- Executor: `docs/executor.md`
- OpenClaw/runtime duty boundary: `docs/openclaw-runtime-contract.md`
- Application ledger: `docs/application-ledger.md`
- Deployment: `docs/deployment.md`
