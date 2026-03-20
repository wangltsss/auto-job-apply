# Job Pool

The job pool is the durable store for pre-eligible job postings.

## Scope
- normalize inbound job URLs and metadata
- deduplicate postings before insertion
- persist queueable job records under `artifacts/job-pool/jobs.json`
- expose manual ingestion and inspection through a stable tool command

The current implementation is intentionally narrow:
- file-backed JSON store
- manual or automated source tagging
- queued-state persistence
- list/filter inspection
- JSON-file batch ingestion for automated producers

Leasing, retries, attempt records, and run control belong to later milestones.

## Tool command
Ingest a posting:

```bash
npm run tool:job-pool -- ingest \
  --url "https://jobs.example.test/apply/12345" \
  --source-type manual \
  --title "Software Engineer"
```

List queued postings:

```bash
npm run tool:job-pool -- list --status queued
```

Batch ingest from a JSON file:

```bash
npm run tool:job-pool -- ingest --input-file ./jobs.json --store-path ./artifacts/job-pool/jobs.json
```

## Output contract
The command follows the same JSON envelope as the other `tool:*` entrypoints:
- success: `ok`, `stage`, `status`, `artifact_paths`, `result`
- failure: `ok`, `stage`, `code`, `error`, `details`

Stage value for this tool is `job_pool`.
