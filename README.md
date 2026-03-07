# Auto-Apply Pipeline Contracts

TypeScript + Playwright project focused on deterministic job-application automation contracts.

## Implemented layers
- Scraper/collector layer for extracting ATS application forms
- Answer Plan contract for reasoning output validation

## Scope
- Opens application pages and extracts normalized form data
- Detects ATS where possible (`greenhouse`, `linkedin_easy_apply`, `unknown`)
- Produces machine-readable JSON artifacts
- Defines strict `AnswerPlan` schema for LLM/OpenClaw output
- Does **not** submit applications

## Quick start
```bash
npm install
npm run scrape -- "https://jobs.example.com/apply"
```

## Contracts
- Extracted form schema: `playwright/schemas/form.schema.json`
- Answer plan schema: `playwright/schemas/answer-plan.schema.json`
- Answer plan examples: `examples/answer-plans/`

## Docs
- Scraper architecture: `docs/architecture.md`
- Answer plan contract: `docs/answer-plan-contract.md`
