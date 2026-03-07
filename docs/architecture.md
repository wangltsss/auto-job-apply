# Scraper Architecture

## Module boundaries
- `playwright/schemas/`: shared TypeScript contracts + JSON schema + lightweight runtime validator
- `playwright/ats/`: ATS detection only
- `playwright/extractors/`: field extraction implementations (`generic`, `greenhouse`, `linkedin_easy_apply`)
- `playwright/core/`: browser session and scrape orchestration
- `playwright/utils/`: text normalization, selector constants, artifact writing

## Runtime flow
1. `scrapeForm()` launches browser context and opens URL.
2. ATS is detected via URL + page content heuristics.
3. Blocked/unusable state is detected (auth, captcha, missing LinkedIn modal).
4. ATS-specific extractor is selected (fallback: generic extractor).
5. Extracted payload is normalized and saved to `artifacts/forms/*.json`.
6. On blocked/error states, screenshot + optional trace are captured and returned in structured failure payload.

## Determinism principles
- Conservative extraction only; no mutation/submission actions.
- Locator-based APIs over brittle deep selectors.
- Bounded page navigation timeout.
- Centralized selector hints and reusable inference helpers.

## Next layer: Answer Plan
The reasoning layer should emit an Answer Plan artifact using `playwright/schemas/answer-plan.schema.json`.
That artifact is the handoff between extraction and deterministic execution.
