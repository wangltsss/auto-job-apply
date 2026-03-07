# Auto-Apply Scraper (Collector Layer)

Deterministic Playwright + TypeScript scraper for extracting job-application forms into a normalized JSON schema.

## Scope
- Opens a job application page
- Detects ATS where possible (`greenhouse`, `linkedin_easy_apply`, fallback `unknown`)
- Extracts current step + visible form fields
- Writes machine-readable artifacts under `artifacts/forms/`
- Does **not** decide answers
- Does **not** submit applications

## Quick start
```bash
npm install
npm run scrape -- "https://jobs.example.com/apply"
```

LinkedIn Easy Apply (already authenticated state expected):
```bash
npm run scrape:linkedin -- "https://www.linkedin.com/jobs/view/..." "./state/linkedin.json"
```

## Output
Artifacts are written as:
- `artifacts/forms/<timestamp>_<page-token>.json`

Failure artifacts include:
- `status`
- `reason`
- `current_url`
- `ats_guess`
- `screenshot_path`
- `trace_path` (if trace enabled)

## Architecture
See `docs/architecture.md`.
