import type { Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';
import { BLOCKED_TEXT_PATTERNS } from '../utils/selectors.js';
import { cleanText } from '../utils/text.js';

export interface BlockState {
  blocked: boolean;
  reason: string;
}

export async function detectBlockedState(page: Page, ats: AtsType): Promise<BlockState> {
  const bodyText = cleanText(await page.locator('body').innerText().catch(() => ''));

  for (const pattern of BLOCKED_TEXT_PATTERNS) {
    if (pattern.test(bodyText)) {
      return { blocked: true, reason: `Page appears blocked/unusable: matched "${pattern.source}"` };
    }
  }

  const captchaNode = page.locator('iframe[src*="captcha"], [id*="captcha"], [class*="captcha"]').first();
  if (await captchaNode.count()) {
    return { blocked: true, reason: 'Captcha detected on page' };
  }

  if (ats === 'linkedin_easy_apply') {
    const easyApplyRoot = page.locator('.jobs-easy-apply-content, .jobs-easy-apply-modal').first();
    if (!(await easyApplyRoot.count())) {
      return { blocked: true, reason: 'LinkedIn Easy Apply modal not open or unavailable' };
    }
  }

  return { blocked: false, reason: '' };
}
