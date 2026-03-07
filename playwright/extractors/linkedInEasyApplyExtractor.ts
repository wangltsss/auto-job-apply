import type { Locator, Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';
import { GenericFormExtractor } from './genericExtractor.js';

export class LinkedInEasyApplyExtractor extends GenericFormExtractor {
  supports(ats: AtsType): boolean {
    return ats === 'linkedin_easy_apply';
  }

  protected override async findFormRoot(page: Page): Promise<Locator | null> {
    const easyApplyRoot = page.locator('.jobs-easy-apply-content, .jobs-easy-apply-modal').first();
    if (await easyApplyRoot.count() && (await easyApplyRoot.isVisible().catch(() => false))) {
      return easyApplyRoot;
    }
    return super.findFormRoot(page);
  }

  protected override async detectCurrentStep(page: Page, container: Locator): Promise<string | null> {
    const explicit = container
      .locator('.jobs-easy-apply-content__step, .jobs-easy-apply-content__header, [aria-current="step"]')
      .first();

    if (await explicit.count()) {
      const text = (await explicit.innerText().catch(() => '')).trim();
      if (text) {
        return text;
      }
    }

    return super.detectCurrentStep(page, container);
  }
}
