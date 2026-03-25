# Project Milestones

## Purpose
This document maps implementation milestones for the autonomous Clawdbot system defined in [autonomous-clawdbot-design.md](/home/shawn/Documents/auto-apply/docs/autonomous-clawdbot-design.md) and identifies the current project position.

## Current Position
The project is currently at `M5: Application Ledger and Provenance`, with `M6` and beyond still pending.

The following capabilities are implemented today:
- deterministic ATS form scraping
- normalized extracted-form artifacts
- structured answer-plan schema and validation
- OpenClaw reasoning bridge
- deterministic executor with dry-run-first behavior
- pipeline orchestration across scrape, answer-plan, and execute stages
- stable tool entrypoints suitable for MCP wrapping
- durable job pool with manual and file-based ingestion
- durable application ledger for attempts and outcomes
- machine-readable artifacts for scrape, answer-plan, execution, and pipeline runs
- baseline tests for schema validation, executor behavior, reasoning bridge behavior, and orchestration

The following capabilities are not yet implemented as system primitives:
- run controller based on target successful applications
- strategic retry scheduling across attempts
- answer provenance tracking
- unresolved uncertainty handling in final reports
- MCP server surface for direct protocol integration

## Milestone Definitions

## M0: Contracts and Repository Foundation
Objective: establish the repository as a typed, testable automation codebase with explicit runtime contracts.

Required outcomes:
- TypeScript project structure is in place.
- shared schemas and validators exist
- local examples and fixtures exist
- build, typecheck, and test workflows exist
- deployment/bootstrap scripts exist for new devices

Status: `Complete`

Evidence:
- [package.json](/home/shawn/Documents/auto-apply/package.json)
- [tsconfig.json](/home/shawn/Documents/auto-apply/tsconfig.json)
- [playwright/schemas/form.schema.json](/home/shawn/Documents/auto-apply/playwright/schemas/form.schema.json)
- [playwright/schemas/answer-plan.schema.json](/home/shawn/Documents/auto-apply/playwright/schemas/answer-plan.schema.json)
- [scripts/bootstrap-device.sh](/home/shawn/Documents/auto-apply/scripts/bootstrap-device.sh)
- [scripts/deploy-on-device.sh](/home/shawn/Documents/auto-apply/scripts/deploy-on-device.sh)

## M1: Deterministic Form Extraction
Objective: reliably open supported application surfaces, detect ATS context, extract normalized fields, and persist form artifacts.

Required outcomes:
- browser session management exists
- ATS detection exists
- extractor selection exists
- blocked/error states are captured structurally
- extracted forms are normalized and written as artifacts

Status: `Complete`

Evidence:
- [playwright/core/scrapeRunner.ts](/home/shawn/Documents/auto-apply/playwright/core/scrapeRunner.ts)
- [playwright/ats/detectAts.ts](/home/shawn/Documents/auto-apply/playwright/ats/detectAts.ts)
- [playwright/extractors/genericExtractor.ts](/home/shawn/Documents/auto-apply/playwright/extractors/genericExtractor.ts)
- [playwright/extractors/greenhouseExtractor.ts](/home/shawn/Documents/auto-apply/playwright/extractors/greenhouseExtractor.ts)
- [playwright/extractors/linkedInEasyApplyExtractor.ts](/home/shawn/Documents/auto-apply/playwright/extractors/linkedInEasyApplyExtractor.ts)
- [docs/architecture.md](/home/shawn/Documents/auto-apply/docs/architecture.md)

## M2: Deterministic Single-Job Runtime
Objective: transform a scraped form into a validated answer plan and deterministically execute it against a live page.

Required outcomes:
- reasoning input builder exists
- OpenClaw prompt/run/parse pipeline exists
- answer-plan validation exists
- deterministic executor exists
- submit gating exists
- execution artifacts exist

Status: `Complete`

Evidence:
- [reasoning/buildReasoningInput.ts](/home/shawn/Documents/auto-apply/reasoning/buildReasoningInput.ts)
- [reasoning/runOpenClaw.ts](/home/shawn/Documents/auto-apply/reasoning/runOpenClaw.ts)
- [reasoning/parseAnswerPlan.ts](/home/shawn/Documents/auto-apply/reasoning/parseAnswerPlan.ts)
- [executor/index.ts](/home/shawn/Documents/auto-apply/executor/index.ts)
- [executor/submitFlow.ts](/home/shawn/Documents/auto-apply/executor/submitFlow.ts)
- [executor/writeExecutionArtifact.ts](/home/shawn/Documents/auto-apply/executor/writeExecutionArtifact.ts)
- [docs/reasoning-bridge.md](/home/shawn/Documents/auto-apply/docs/reasoning-bridge.md)
- [docs/executor.md](/home/shawn/Documents/auto-apply/docs/executor.md)

## M3: Unified Tooling and Pipeline Invocation
Objective: expose the deterministic runtime through stable CLI entrypoints and a single pipeline invocation surface.

Required outcomes:
- scrape CLI exists
- answer-plan CLI exists
- execution CLI exists
- pipeline CLI exists
- stage wrappers and top-level pipeline artifacts exist

Status: `Complete`

Evidence:
- [tools/scrape-cli.ts](/home/shawn/Documents/auto-apply/tools/scrape-cli.ts)
- [tools/answer-plan-cli.ts](/home/shawn/Documents/auto-apply/tools/answer-plan-cli.ts)
- [tools/execute-cli.ts](/home/shawn/Documents/auto-apply/tools/execute-cli.ts)
- [tools/pipeline-cli.ts](/home/shawn/Documents/auto-apply/tools/pipeline-cli.ts)
- [orchestration/pipeline.ts](/home/shawn/Documents/auto-apply/orchestration/pipeline.ts)
- [docs/orchestration.md](/home/shawn/Documents/auto-apply/docs/orchestration.md)
- [docs/openclaw-integration.md](/home/shawn/Documents/auto-apply/docs/openclaw-integration.md)

## M4: Job Pool and Ingestion Layer
Objective: introduce a durable pool of pre-eligible job postings with normalization, deduplication, and ingestion workflows.

Required outcomes:
- durable job-posting store exists
- manual ingestion path exists
- automated ingestion path contract exists
- canonicalization and deduplication exist
- job lifecycle state is persisted

Status: `Complete`

Primary design reference:
- [docs/autonomous-clawdbot-design.md](/home/shawn/Documents/auto-apply/docs/autonomous-clawdbot-design.md)

Evidence:
- [job-pool/index.ts](/home/shawn/Documents/auto-apply/job-pool/index.ts)
- [tools/job-pool-cli.ts](/home/shawn/Documents/auto-apply/tools/job-pool-cli.ts)
- [docs/job-pool.md](/home/shawn/Documents/auto-apply/docs/job-pool.md)
- [tests/job-pool.spec.ts](/home/shawn/Documents/auto-apply/tests/job-pool.spec.ts)
- [tests/job-pool-cli.spec.ts](/home/shawn/Documents/auto-apply/tests/job-pool-cli.spec.ts)

## M5: Application Ledger and Provenance
Objective: persist attempts and final application outcomes as first-class system records rather than only filesystem artifacts.

Required outcomes:
- application attempt record exists
- success record exists
- failure record exists
- answer provenance is persisted
- artifact references are linked from durable records

Status: `Partially Complete`

Completed:
- durable attempt records exist
- durable success and failure records exist
- artifact references are linked from ledger records

Remaining:
- explicit provenance classes are not yet persisted
- unresolved uncertainty records are not yet stored as first-class ledger entities

Evidence:
- [application-ledger/index.ts](/home/shawn/Documents/auto-apply/application-ledger/index.ts)
- [application-ledger/recordExecutionOutcome.ts](/home/shawn/Documents/auto-apply/application-ledger/recordExecutionOutcome.ts)
- [docs/application-ledger.md](/home/shawn/Documents/auto-apply/docs/application-ledger.md)
- [tests/application-ledger.spec.ts](/home/shawn/Documents/auto-apply/tests/application-ledger.spec.ts)

## M6: Run Controller and Strategic Retries
Objective: process postings from the pool until the target number of successful applications has been reached or the pool is exhausted.

Required outcomes:
- run record exists
- target success count exists
- job claiming exists
- strategic retry scheduling exists
- duplicate concurrent processing is prevented
- run completion semantics are based on successful applications

Status: `Not Started`

Current gap:
- the current pipeline processes one explicit URL, not a pool-backed run
- no strategic retry manager exists across job attempts
- no success-targeted run controller exists

## M7: Clawdbot Reasoning Participation
Objective: incorporate Clawdbot as the answer-inference participant for underspecified questionnaire fields while preserving deterministic execution.

Required outcomes:
- structured reasoning contract between runtime and Clawdbot exists
- inferred answers are tagged by provenance
- confidence thresholds exist
- unresolved uncertain answers are surfaced in the final report
- runtime policy gates submission of low-confidence answers

Status: `Not Started`

Current gap:
- current reasoning assumes an answer-plan generator, but does not model provenance classes or uncertainty escalation
- no explicit Clawdbot integration contract exists yet

## M8: Published Package and OpenClaw Skill Surface
Objective: publish the project as a reusable package, OpenClaw skill, and MCP-integrated tool surface with stable external operations.

Required outcomes:
- package-facing API surface exists
- skill-facing and MCP-facing commands are defined and documented
- enqueue, start-run, query-run, and query-job interfaces exist
- external result contracts are stable and documented

Status: `Not Started`

Current gap:
- the repository exposes internal CLIs, but not a finalized package API or skill contract
- no MCP server surface is implemented
- external run-level interfaces defined in the design doc are not implemented

## M9: Incident Handling and Operational Hardening
Objective: detect systemic failures, prevent retry storms, and make autonomous operation safe over repeated runs.

Required outcomes:
- site-level or ATS-level incident signatures exist
- repeated-failure aggregation exists
- cooldown or pause behavior exists
- session-state failure handling is explicit
- operational reporting is suitable for unattended runs

Status: `Not Started`

Current gap:
- failure codes exist at stage level, but there is no cross-run incident aggregation
- no system-wide pause, cooldown, or failure-burst handling exists

## Summary Table
| Milestone | Name | Status |
| --- | --- | --- |
| M0 | Contracts and Repository Foundation | Complete |
| M1 | Deterministic Form Extraction | Complete |
| M2 | Deterministic Single-Job Runtime | Complete |
| M3 | Unified Tooling and Pipeline Invocation | Complete |
| M4 | Job Pool and Ingestion Layer | Complete |
| M5 | Application Ledger and Provenance | Partially Complete |
| M6 | Run Controller and Strategic Retries | Not Started |
| M7 | Clawdbot Reasoning Participation | Not Started |
| M8 | Published Package and OpenClaw Skill Surface | Not Started |
| M9 | Incident Handling and Operational Hardening | Not Started |

## Current Assessment
The repository has already cleared the hardest foundational engineering work for deterministic automation. It is no longer a prototype scraper; it is a functioning single-job execution core with contracts, orchestration, and tests.

Relative to the autonomous system design, the project now has:
- a complete deterministic runtime
- a durable job pool
- a first ledger slice for execution outcomes

The next milestone boundary is `M6`. That is the point where the repository stops being a collection of durable subsystems and becomes a pool-backed autonomous execution system.
