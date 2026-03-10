# OpenClaw Integration Surface

Use these local tool commands as stable entrypoints for OpenClaw.

## Commands
- `npm run tool:scrape -- --url <job_url> [--storage-state <path>] [--headed] [--no-trace]`
- `npm run tool:answer-plan -- --form-artifact <path> [--profile <path>] [--mock-response <path>]`
- `npm run tool:execute -- --form-artifact <path> --answer-plan-artifact <path> [--storage-state <path>] [--headed] [--submit] [--cdp-endpoint <url>] [--mock]`
- `npm run tool:pipeline -- --url <job_url> [--mode scrape|scrape-answer-plan|full] [--storage-state <path>] [--headed] [--mock-response <path>] [--mock-execution]`

## Stdout contract
- Success: JSON object with `ok: true` and artifact paths.
- Failure: JSON object written to stderr with `ok: false` and error string.
- Exit code is non-zero on failure.

## Safest default
Start with pipeline dry-run:
- `npm run tool:pipeline -- --url <job_url> --mode full --dry-run`

## Before autonomous submit
- Keep `--submit` explicit and gated.
- Continue requiring policy-valid answer plans and successful dry-run verification.
