import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface SessionOptions {
  headless: boolean;
  storageStatePath?: string;
  traceEnabled: boolean;
}

export async function createSession(options: SessionOptions): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext(
    options.storageStatePath ? { storageState: options.storageStatePath } : undefined
  );

  if (options.traceEnabled) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeSession(session: BrowserSession): Promise<void> {
  await session.context.close();
  await session.browser.close();
}
