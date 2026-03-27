import type { Locator, Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';
import { GenericFormExtractor } from './genericExtractor.js';

export class WorkdayExtractor extends GenericFormExtractor {
  supports(ats: AtsType): boolean {
    return ats === 'workday';
  }

  protected override async findFormRoot(page: Page): Promise<Locator | null> {
    const selectors = [
      '[data-automation-id="jobApplication"]',
      '[data-automation-id="careerApplication"]',
      'form[data-automation-id]',
      'form'
    ];

    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.count() && (await locator.isVisible().catch(() => false))) {
        return locator;
      }
    }

    return super.findFormRoot(page);
  }

  protected override async detectCurrentStep(page: Page, container: Locator): Promise<string | null> {
    const selectors = [
      '[data-automation-id="progressBar"] [aria-current="step"]',
      '[data-automation-id="pageHeader"]',
      '[data-automation-id="formTitle"]',
      'h2[data-automation-id]',
      'h3[data-automation-id]'
    ];

    for (const selector of selectors) {
      const node = container.locator(selector).first();
      if (await node.count()) {
        const text = (await node.innerText().catch(() => '')).trim();
        if (text) {
          return text;
        }
      }
    }

    return super.detectCurrentStep(page, container);
  }

  protected override async detectSubmitState(container: Locator): Promise<{ visible: boolean; enabled: boolean }> {
    const selectors = [
      'button[data-automation-id="pageFooterSubmitButton"]',
      'button[data-automation-id="bottom-navigation-next-button"]',
      'button[data-automation-id="pageFooterNextButton"]',
      'button[data-automation-id="pageFooterContinueButton"]',
      'button[data-automation-id="pageFooterReviewButton"]',
      'button[type="submit"]',
      'input[type="submit"]'
    ];

    for (const selector of selectors) {
      const buttons = container.locator(selector);
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        if (!(await button.isVisible().catch(() => false))) {
          continue;
        }

        return {
          visible: true,
          enabled: await button.isEnabled().catch(() => false)
        };
      }
    }

    return super.detectSubmitState(container);
  }
}
