import type { Frame, Locator, Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';
import type { ExtractorResult } from './base.js';
import { GenericFormExtractor } from './genericExtractor.js';

export class GreenhouseExtractor extends GenericFormExtractor {
  supports(ats: AtsType): boolean {
    return ats === 'greenhouse';
  }

  override async extract(page: Page): Promise<ExtractorResult> {
    const greenhouseFrame = await this.findGreenhouseFrame(page);
    if (!greenhouseFrame) {
      return super.extract(page);
    }

    const warnings: string[] = [];
    const formRoot = await this.findFrameFormRoot(greenhouseFrame);

    if (!formRoot) {
      warnings.push('Greenhouse iframe detected but no application form root was found.');
    }

    const container = formRoot ?? greenhouseFrame.locator('body');
    const currentStep = await this.detectCurrentStep(greenhouseFrame as unknown as Page, container);
    const fields = await this.extractFields(container);
    const submit = await this.detectSubmitState(container);
    const formReady = fields.some((field) => field.visible);

    return {
      fields,
      currentStep,
      formReady,
      submitVisible: submit.visible,
      submitEnabled: submit.enabled,
      warnings
    };
  }

  protected override async findFormRoot(page: Page): Promise<Locator | null> {
    const selectors = [
      '#application_form',
      'form#application-form',
      '#grnhse_app',
      '[id^="grnhse_app"]',
      '.grnhse-app',
      'iframe[src*="greenhouse.io"]'
    ];

    for (const selector of selectors) {
      const greenhouseRoot = page.locator(selector).first();
      if (await greenhouseRoot.count() && (await greenhouseRoot.isVisible().catch(() => false))) {
        return greenhouseRoot;
      }
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
      '#submit_app',
      'button[name="commit"]',
      'input[name="commit"]',
      '.apply_button',
      '.application--submit button',
      '.application--buttons button',
      '.application__submit button',
      '.application-footer button',
      '.app-footer button',
      '.app-actions button',
      'button[data-testid*="submit"]',
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

  private async findGreenhouseFrame(page: Page): Promise<Frame | null> {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) {
        continue;
      }

      const frameUrl = frame.url().toLowerCase();
      if (frameUrl.includes('greenhouse.io')) {
        return frame;
      }

      try {
        const frameHtml = (await frame.content()).toLowerCase();
        if (
          frameHtml.includes('application_form') ||
          frameHtml.includes('grnhse') ||
          frameHtml.includes('greenhouse')
        ) {
          return frame;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private async findFrameFormRoot(frame: Frame): Promise<Locator | null> {
    const selectors = [
      '#application_form',
      'form#application-form',
      'form[action*="greenhouse.io"]',
      'form[action*="/applications"]',
      'form'
    ];

    for (const selector of selectors) {
      const root = frame.locator(selector).first();
      if (await root.count() && (await root.isVisible().catch(() => false))) {
        return root;
      }
    }

    return null;
  }
}
