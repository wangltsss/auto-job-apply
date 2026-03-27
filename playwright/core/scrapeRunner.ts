import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { detectAts } from '../ats/detectAts.js';
import { chooseExtractor } from '../extractors/index.js';
import type { ExtractedFormFailure, ExtractedFormResult, ExtractedFormSuccess, ScrapeOptions, ScrapeStatus } from '../schemas/types.js';
import { nowIso, slugify, timestampForFile } from '../utils/text.js';
import { writeFormArtifact } from '../utils/artifactWriter.js';
import { closeSession, createSession } from './session.js';
import { detectBlockedState } from './pageState.js';

export interface ScrapeOutput {
  result: ExtractedFormResult;
  artifactPath: string;
}

export async function scrapeForm(options: ScrapeOptions): Promise<ScrapeOutput> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const headless = options.headless ?? true;
  const traceEnabled = options.traceEnabled ?? true;
  const runtimeDir = resolve('artifacts/runtime');
  await mkdir(runtimeDir, { recursive: true });

  const session = await createSession({
    headless,
    traceEnabled,
    storageStatePath: options.storageStatePath
  });

  let tracePath: string | null = null;
  let screenshotPath: string | null = null;

  try {
    await session.page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    const currentUrl = session.page.url();
    const ats = await detectAts(session.page, currentUrl);
    const blocked = await detectBlockedState(session.page, ats);

    if (blocked.blocked) {
      const failure = await buildFailure(
        session.page,
        'blocked',
        blocked.reason,
        ats,
        traceEnabled,
        runtimeDir,
        screenshotPath,
        tracePath,
        session.context
      );
      const artifactPath = await writeFormArtifact(failure);
      return { result: failure, artifactPath };
    }

    const extractor = chooseExtractor(ats);
    const extracted = await extractor.extract(session.page);

    const success: ExtractedFormSuccess = {
      status: 'success',
      url: currentUrl,
      ats,
      page_title: await session.page.title(),
      current_step: extracted.currentStep,
      form_ready: extracted.formReady,
      submit_visible: extracted.submitVisible,
      submit_enabled: extracted.submitEnabled,
      fields: extracted.fields,
      warnings: extracted.warnings,
      extracted_at: nowIso()
    };

    if (traceEnabled) {
      await session.context.tracing.stop().catch(() => undefined);
    }

    const artifactPath = await writeFormArtifact(success);
    return { result: success, artifactPath };
  } catch (error) {
    const currentUrl = safeCurrentUrl(session.page, options.url);
    const atsGuess = await detectAts(session.page, currentUrl).catch(() => 'unknown' as const);
    const reason = error instanceof Error ? error.message : 'Unknown scraper error';

    const failure = await buildFailure(
      session.page,
      'error',
      reason,
      atsGuess,
      traceEnabled,
      runtimeDir,
      screenshotPath,
      tracePath,
      session.context
    );
    const artifactPath = await writeFormArtifact(failure);
    return { result: failure, artifactPath };
  } finally {
    await closeSession(session);
  }
}

async function buildFailure(
  page: { url(): string; screenshot: (options: { path: string; fullPage: boolean }) => Promise<Buffer> },
  status: Extract<ScrapeStatus, 'blocked' | 'error'>,
  reason: string,
  atsGuess: 'greenhouse' | 'workday' | 'unknown',
  traceEnabled: boolean,
  runtimeDir: string,
  screenshotPath: string | null,
  tracePath: string | null,
  context: { tracing: { stop: (options: { path: string }) => Promise<void> } }
): Promise<ExtractedFormFailure> {
  const stamp = timestampForFile();
  const slug = slugify(page.url());
  const computedScreenshotPath = resolve(runtimeDir, `${stamp}_${slug}.png`);

  try {
    await page.screenshot({ path: computedScreenshotPath, fullPage: true });
    screenshotPath = computedScreenshotPath;
  } catch {
    screenshotPath = null;
  }

  if (traceEnabled) {
    const computedTracePath = resolve(runtimeDir, `${stamp}_${slug}.zip`);
    try {
      await context.tracing.stop({ path: computedTracePath });
      tracePath = computedTracePath;
    } catch {
      tracePath = null;
    }
  }

  return {
    status,
    reason,
    current_url: page.url(),
    ats_guess: atsGuess,
    screenshot_path: screenshotPath,
    trace_path: tracePath,
    extracted_at: nowIso()
  };
}

function safeCurrentUrl(page: { url(): string }, fallback: string): string {
  try {
    return page.url() || fallback;
  } catch {
    return fallback;
  }
}
