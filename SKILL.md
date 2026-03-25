---
name: auto-apply
description: Deterministic job-application runtime for ingesting eligible postings, starting bounded runs, and querying durable job, run, ledger, and incident state.
version: 0.1.0
metadata: {"openclaw":{"requires":{"bins":["node","npm"]},"emoji":"🧰","os":["darwin","linux","win32"]}}
---

# Auto Apply Runtime

This skill exposes the repository at `{baseDir}` as an OpenClaw job-application runtime.

## Purpose
- ingest eligible job postings into the durable job pool
- start bounded autonomous application runs
- expose durable job, run, ledger, and incident state
- keep browser execution deterministic behind the skill boundary

## Primary Commands
- `/ingest`
  - preferred shortcut for adding one or more job URLs to the job pool
  - accepts `url` or `urls`
  - accepts optional metadata such as `title`, `company`, `location`, and `notes`
- `/apply`
  - preferred shortcut for starting a bounded application run
  - accepts `count` or `target_success_count`
  - accepts optional runtime overrides such as store paths and dry-run flags

## Structured Operations
- `describe_operations`
- `enqueue_posting`
- `query_job`
- `start_run`
- `query_run`
- `query_ledger`
- `query_incidents`

## Skill Boundary
OpenClaw is responsible for:
- deciding whether a posting is eligible
- deciding whether anti-bot or unsupported flows should be abandoned
- supplying applicant facts and inference context
- presenting clarification items to the user

The repository is responsible for:
- durable job-pool state
- deterministic scrape, answer-plan, and execution orchestration
- run control and strategic retries
- ledger and incident persistence

## Adapter Entry Point
Use the local skill adapter command from `{baseDir}`:

```bash
npm run tool:skill -- describe
npm run tool:skill -- call --operation /ingest --input-json '{"url":"https://example.com/job"}'
npm run tool:skill -- call --operation /apply --input-json '{"count":1}'
```

## Related Docs
- `docs/openclaw-integration.md`
- `docs/skill-contract.md`
- `docs/openclaw-runtime-contract.md`
- `docs/package-api.md`
