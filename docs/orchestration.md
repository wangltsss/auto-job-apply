# Orchestration Layer

This layer provides thin integration helpers around existing modules:
- scrape
- answer-plan reasoning bridge
- execution

It does not contain browser business logic or reasoning logic.

## Stage wrappers
- `orchestration/runScrape.ts`
- `orchestration/runAnswerPlan.ts`
- `orchestration/runExecution.ts`

## Pipeline
- `orchestration/pipeline.ts`

Modes:
- `scrape`
- `scrape-answer-plan`
- `full`

All modes write a top-level pipeline run artifact:
- `artifacts/pipeline-runs/<timestamp>_<token>.json`

## Failure behavior
- Pipeline stops on first stage failure.
- Failure stage and code are captured in the pipeline run artifact.
