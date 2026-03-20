# Deployment Guide (Other Devices)

This project is designed to be moved across your own devices via git clone + deterministic setup scripts.

## What this covers
- Install dependencies
- Install Playwright Chromium binary
- Prepare artifact directories
- Verify local toolchain health
- Keep updates repeatable

## Prerequisites on target device
- `git`
- Node.js `>= 20`
- `npm`
- Optional: `openclaw` CLI for real answer-plan generation (mock mode works without it)

## Option A: One-command deploy from git URL
Run on the target device:

```bash
bash ./scripts/deploy-on-device.sh --repo "<your_git_repo_url>" --dir "$HOME/auto-apply" --branch main
```

If Linux system dependencies are missing for Playwright:

```bash
bash ./scripts/deploy-on-device.sh --repo "<your_git_repo_url>" --with-deps
```

## Option B: Manual clone + bootstrap

```bash
git clone --branch main "<your_git_repo_url>" "$HOME/auto-apply"
cd "$HOME/auto-apply"
bash scripts/bootstrap-device.sh
```

With Playwright OS deps install:

```bash
bash scripts/bootstrap-device.sh --with-deps
```

## Health check

```bash
npm run doctor
```

The command prints JSON:
- `ok: true` means toolchain looks ready.
- `ok: false` includes machine-readable `issues`.

## First-run smoke checks

Scrape only:

```bash
npm run tool:scrape -- --url "https://jobs.example.test/apply/0001"
```

Job-pool ingest:

```bash
npm run tool:job-pool -- ingest --url "https://jobs.example.test/apply/0001"
```

Pipeline dry-run (safe default):

```bash
npm run tool:pipeline -- \
  --url "https://jobs.example.test/apply/0001" \
  --mode full \
  --dry-run \
  --mock-response examples/fixtures/valid-openclaw-response.json
```

## Updating an existing device

```bash
cd "$HOME/auto-apply"
git pull --ff-only origin main
bash scripts/bootstrap-device.sh
npm run doctor
```

## Notes
- Keep submission disabled unless explicitly intended (`--submit`).
- For authenticated flows, pass `--storage-state <path>` to execution/pipeline commands.
- Artifacts are written under `artifacts/` and are machine-readable for downstream automation.
