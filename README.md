# Auto-Apply Pipeline Contracts

TypeScript + Playwright project focused on deterministic job-application automation contracts.

## Implemented layers
- Scraper/collector layer for extracting ATS application forms
- Reasoning bridge for OpenClaw prompt/run/parse/validate/write
- Executor CLI for deterministic answer-plan application on real pages (dry-run by default)
- Answer Plan contract for reasoning output validation

## Scope
- Opens application pages and extracts normalized form data
- Detects ATS where possible (`greenhouse`, `linkedin_easy_apply`, `unknown`)
- Produces machine-readable JSON artifacts
- Defines strict `AnswerPlan` schema for LLM/OpenClaw output
- Deterministically executes validated answer plans
- Does **not** do new reasoning during execution

## Quick start
```bash
npm install
npm run setup:device
npm run scrape -- "https://jobs.example.com/apply"
npm run answer-plan
npm run executor -- --mock
```

## Contracts
- Extracted form schema: `playwright/schemas/form.schema.json`
- Answer plan schema: `playwright/schemas/answer-plan.schema.json`
- Reasoning fixtures: `examples/fixtures/`

## Docs
- Scraper architecture: `docs/architecture.md`
- Answer plan contract: `docs/answer-plan-contract.md`
- Reasoning bridge: `docs/reasoning-bridge.md`
- Executor: `docs/executor.md`
- Deployment: `docs/deployment.md`
