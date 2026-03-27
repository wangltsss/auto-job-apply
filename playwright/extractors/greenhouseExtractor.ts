import type { Locator, Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';
import { GenericFormExtractor } from './genericExtractor.js';

export class GreenhouseExtractor extends GenericFormExtractor {
  supports(ats: AtsType): boolean {
    return ats === 'greenhouse';
  }

  protected override async findFormRoot(page: Page): Promise<Locator | null> {
    const greenhouseRoot = page.locator('#application_form, form#application-form').first();
    if (await greenhouseRoot.count() && (await greenhouseRoot.isVisible().catch(() => false))) {
      return greenhouseRoot;
    }
    return super.findFormRoot(page);
  }

  protected override async detectCurrentStep(page: Page, container: Locator): Promise<string | null> {
    const heading = page.locator('.app-title, h1.app-title, .heading').first();
    if (await heading.count()) {
      const text = (await heading.innerText().catch(() => '')).trim();
      if (text) {
        return text;
      }
    }

    const legend = container.locator('fieldset legend').first();
    if (await legend.count()) {
      const text = (await legend.innerText().catch(() => '')).trim();
      if (text) {
        return text;
      }
    }

    return super.detectCurrentStep(page, container);
  }

  protected override async detectSubmitState(container: Locator): Promise<{ visible: boolean; enabled: boolean }> {
    const selectors = [
      '.application--submit button',
      '.application--buttons button',
      '.application-footer button',
      'button[type="submit"]',
      'input[type="submit"]'
    ];

    for (const selector of selectors) {
      const buttons = container.locator(selector);
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        const text = await button.innerText().catch(() => '');
        const value = await button.getAttribute('value').catch(() => '');
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        const label = `${text} ${value} ${ariaLabel}`.trim().toLowerCase();
        if (!/(submit|apply|review|next|continue)/i.test(label)) {
          continue;
        }

        return {
          visible: await button.isVisible().catch(() => false),
          enabled: await button.isEnabled().catch(() => false)
        };
      }
    }

    return super.detectSubmitState(container);
  }
}
