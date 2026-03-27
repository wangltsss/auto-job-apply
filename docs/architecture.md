# Scraper Architecture

## Module boundaries
- `playwright/schemas/`: shared TypeScript contracts + JSON schema + runtime validators
- `playwright/ats/`: ATS detection only
- `playwright/extractors/`: field extraction implementations (`generic`, `greenhouse`, `workday`)
- `playwright/core/`: browser session and scrape orchestration
- `playwright/utils/`: text normalization, selector constants, semantic inference, field identity, and artifact writing

## Runtime flow
1. `scrapeForm()` launches browser context and opens URL.
2. ATS is detected via URL + page content heuristics.
3. Blocked/unusable state is detected (auth, captcha, or unsupported access state).
4. ATS-specific extractor is selected (fallback: generic extractor).
5. Extracted payload is normalized and saved to `artifacts/forms/*.json`.
6. On blocked/error states, screenshot + optional trace are captured and returned in structured failure payload.

## Field identity contract
`field_id` generation is deterministic and follows this precedence:
1. DOM `name` attribute
2. DOM `id` attribute
3. normalized label slug
4. normalized section+label slug
5. hash fallback (`field-<sha1_10>`) as last resort

This behavior is implemented in `playwright/utils/fieldIdentity.ts`.

## Output quality policy
- Internal helper controls are filtered from the primary field list.
- Sensitive fields are marked with explicit `semantic_category`, `sensitivity`, and `auto_answer_safe`.
- File uploads are enriched with `file_kind` and stronger labels when evidence exists.
- Select/combobox ambiguity is explicit through `options_deferred`.

## Next layer: Answer Plan
The reasoning layer should emit an Answer Plan artifact using `playwright/schemas/answer-plan.schema.json`.
That artifact is the handoff between extraction and deterministic execution.
