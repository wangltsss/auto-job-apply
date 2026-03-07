import type { Locator, Page } from 'playwright';
import type { AtsType, ExtractedField, FieldType } from '../schemas/types.js';
import type { ExtractorResult, FormExtractor } from './base.js';
import { HELP_TEXT_SELECTORS, PRIMARY_FORM_SELECTORS, STEP_HINT_SELECTORS, VALIDATION_SELECTORS } from '../utils/selectors.js';
import { cleanText, nullIfEmpty } from '../utils/text.js';
import { inferTypeFromInput, isLikelyRequired, isSubmitLike } from '../utils/formInference.js';

interface ControlSnapshot {
  id: string | null;
  name: string | null;
  typeAttr: string | null;
  tagName: string;
  role: string | null;
  ariaLabel: string | null;
  placeholder: string | null;
  requiredAttr: string | null;
  ariaRequired: string | null;
  value: string | null;
  checked: boolean | null;
  disabledAttr: string | null;
  labelText: string | null;
  sectionText: string | null;
  helpText: string | null;
  validationText: string | null;
  selectorHint: string | null;
  optionTexts: string[];
}

export class GenericFormExtractor implements FormExtractor {
  supports(_ats: AtsType): boolean {
    return true;
  }

  async extract(page: Page): Promise<ExtractorResult> {
    const formRoot = await this.findFormRoot(page);
    const warnings: string[] = [];

    if (!formRoot) {
      warnings.push('No explicit form root found. Falling back to page-level controls.');
    }

    const container = formRoot ?? page.locator('body');
    const currentStep = await this.detectCurrentStep(page, container);
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

  protected async findFormRoot(page: Page): Promise<Locator | null> {
    for (const selector of PRIMARY_FORM_SELECTORS) {
      const loc = page.locator(selector).first();
      if (await loc.count() && (await loc.isVisible().catch(() => false))) {
        return loc;
      }
    }
    return null;
  }

  protected async detectCurrentStep(page: Page, container: Locator): Promise<string | null> {
    for (const selector of STEP_HINT_SELECTORS) {
      const node = container.locator(selector).first();
      if (await node.count()) {
        const text = cleanText(await node.innerText().catch(() => ''));
        if (text) {
          return text;
        }
      }
    }

    const heading = page.getByRole('heading').first();
    if (await heading.count()) {
      return nullIfEmpty(await heading.innerText().catch(() => ''));
    }

    return null;
  }

  protected async extractFields(container: Locator): Promise<ExtractedField[]> {
    const controls = container.locator('input, textarea, select, [role="combobox"]');
    const count = await controls.count();
    const fields: ExtractedField[] = [];
    const seenRadioGroups = new Set<string>();

    for (let i = 0; i < count; i += 1) {
      const control = controls.nth(i);
      const snapshot = await this.snapshotControl(control);
      const fieldType = this.resolveFieldType(snapshot);

      if (fieldType === 'radio') {
        const groupKey = snapshot.name ?? snapshot.id;
        if (!groupKey || seenRadioGroups.has(groupKey)) {
          continue;
        }
        seenRadioGroups.add(groupKey);
        fields.push(await this.buildRadioGroupField(container, snapshot, groupKey));
        continue;
      }

      if (!snapshot.labelText && !snapshot.ariaLabel && fieldType === 'unknown') {
        continue;
      }

      fields.push({
        field_id: this.resolveFieldId(snapshot, i),
        label: cleanText(snapshot.labelText ?? snapshot.ariaLabel ?? snapshot.name ?? snapshot.id ?? 'Unknown field'),
        type: fieldType,
        required: isLikelyRequired(snapshot.labelText ?? '', snapshot.ariaRequired, snapshot.requiredAttr),
        options: snapshot.optionTexts,
        placeholder: nullIfEmpty(snapshot.placeholder),
        help_text: nullIfEmpty(snapshot.helpText),
        section: nullIfEmpty(snapshot.sectionText),
        current_value: this.resolveCurrentValue(snapshot, fieldType),
        selector_hint: snapshot.selectorHint,
        visible: await control.isVisible().catch(() => false),
        enabled: await control.isEnabled().catch(() => false),
        validation_text: nullIfEmpty(snapshot.validationText)
      });
    }

    return fields;
  }

  protected resolveFieldType(snapshot: ControlSnapshot): FieldType {
    if (snapshot.tagName === 'textarea') {
      return 'textarea';
    }
    if (snapshot.tagName === 'select') {
      return 'select';
    }
    if (snapshot.role?.toLowerCase() === 'combobox') {
      return 'combobox';
    }
    return inferTypeFromInput(snapshot.typeAttr, snapshot.role);
  }

  protected async buildRadioGroupField(
    container: Locator,
    firstSnapshot: ControlSnapshot,
    groupKey: string
  ): Promise<ExtractedField> {
    const radios =
      firstSnapshot.name
        ? container.locator(`input[type="radio"][name="${cssEscape(firstSnapshot.name)}"]`)
        : container.locator(`input[type="radio"]#${cssEscape(groupKey)}`);
    const radioCount = await radios.count();
    const options: string[] = [];
    let selected: string | null = null;
    let visible = false;
    let enabled = false;

    for (let i = 0; i < radioCount; i += 1) {
      const radio = radios.nth(i);
      const shot = await this.snapshotControl(radio);
      const label = cleanText(shot.labelText ?? shot.ariaLabel ?? shot.value ?? `Option ${i + 1}`);
      if (label) {
        options.push(label);
      }
      if (shot.checked) {
        selected = label;
      }
      visible = visible || (await radio.isVisible().catch(() => false));
      enabled = enabled || (await radio.isEnabled().catch(() => false));
    }

    return {
      field_id: firstSnapshot.name ?? firstSnapshot.id ?? `radio-${groupKey}`,
      label: cleanText(firstSnapshot.labelText ?? firstSnapshot.ariaLabel ?? firstSnapshot.name ?? 'Radio group'),
      type: 'radio',
      required: isLikelyRequired(firstSnapshot.labelText ?? '', firstSnapshot.ariaRequired, firstSnapshot.requiredAttr),
      options,
      placeholder: null,
      help_text: nullIfEmpty(firstSnapshot.helpText),
      section: nullIfEmpty(firstSnapshot.sectionText),
      current_value: selected,
      selector_hint: firstSnapshot.selectorHint,
      visible,
      enabled,
      validation_text: nullIfEmpty(firstSnapshot.validationText)
    };
  }

  protected async snapshotControl(control: Locator): Promise<ControlSnapshot> {
    return control.evaluate((node, args) => {
      const element = node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const tagName = element.tagName.toLowerCase();
      const id = element.id || null;
      const name = element.getAttribute('name');
      const typeAttr = element.getAttribute('type');
      const role = element.getAttribute('role');
      const ariaLabel = element.getAttribute('aria-label');
      const placeholder = 'placeholder' in element ? (element as HTMLInputElement).placeholder : null;
      const requiredAttr = element.getAttribute('required');
      const ariaRequired = element.getAttribute('aria-required');
      const disabledAttr = element.getAttribute('disabled');
      const value = 'value' in element ? (element as HTMLInputElement).value : null;
      const checked = 'checked' in element ? Boolean((element as HTMLInputElement).checked) : null;

      const labels = 'labels' in element && element.labels ? Array.from(element.labels) : [];
      const labelFromLabels = labels.map((label) => label.textContent ?? '').join(' ').trim();
      const labelFromFor = id
        ? (document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? '').trim()
        : '';
      const labelText = labelFromLabels || labelFromFor || null;

      const optionTexts: string[] = [];
      if (tagName === 'select') {
        const options = Array.from((element as HTMLSelectElement).options);
        for (const option of options) {
          const text = option.textContent?.trim();
          if (text) {
            optionTexts.push(text);
          }
        }
      }

      if (role === 'combobox') {
        const controlsId = element.getAttribute('aria-controls');
        if (controlsId) {
          const listbox = document.getElementById(controlsId);
          const listOptions = listbox?.querySelectorAll('[role="option"]') ?? [];
          listOptions.forEach((option) => {
            const text = option.textContent?.trim();
            if (text) {
              optionTexts.push(text);
            }
          });
        }
      }

      const fieldContainer = element.closest('fieldset, .field, .application-question, .jobs-easy-apply-form-section__grouping');
      const sectionNode = fieldContainer?.closest('section, .application-section, .jobs-easy-apply-form-section')
        ?.querySelector('h2, h3, legend, .header, .title');

      const helpText = args.helpSelectors
        .map((selector: string) => fieldContainer?.querySelector(selector)?.textContent?.trim() ?? '')
        .find((text: string) => text.length > 0) || null;

      const validationText = args.validationSelectors
        .map((selector: string) => fieldContainer?.querySelector(selector)?.textContent?.trim() ?? '')
        .find((text: string) => text.length > 0) || null;

      let selectorHint: string | null = null;
      if (id) {
        selectorHint = `#${id}`;
      } else if (name) {
        selectorHint = `[name="${name}"]`;
      } else if (ariaLabel) {
        selectorHint = `[aria-label="${ariaLabel}"]`;
      }

      return {
        id,
        name,
        typeAttr,
        tagName,
        role,
        ariaLabel,
        placeholder,
        requiredAttr,
        ariaRequired,
        value,
        checked,
        disabledAttr,
        labelText,
        sectionText: sectionNode?.textContent?.trim() ?? null,
        helpText,
        validationText,
        selectorHint,
        optionTexts
      };
    }, { helpSelectors: HELP_TEXT_SELECTORS, validationSelectors: VALIDATION_SELECTORS });
  }

  protected async detectSubmitState(container: Locator): Promise<{ visible: boolean; enabled: boolean }> {
    const buttons = container.locator('button, input[type="submit"], [role="button"]');
    const count = await buttons.count();

    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i);
      const text = await button.innerText().catch(() => '');
      const value = await button.getAttribute('value').catch(() => '');
      const label = cleanText(text || value || '');
      if (!isSubmitLike(label)) {
        continue;
      }
      return {
        visible: await button.isVisible().catch(() => false),
        enabled: await button.isEnabled().catch(() => false)
      };
    }

    return { visible: false, enabled: false };
  }

  protected resolveFieldId(snapshot: ControlSnapshot, index: number): string {
    return snapshot.id ?? snapshot.name ?? `field-${index + 1}`;
  }

  protected resolveCurrentValue(snapshot: ControlSnapshot, type: FieldType): string | boolean | string[] | null {
    if (type === 'checkbox') {
      return Boolean(snapshot.checked);
    }
    if (type === 'file') {
      return null;
    }
    return nullIfEmpty(snapshot.value);
  }
}

function cssEscape(value: string): string {
  return value.replace(/(["\\.#:[\]])/g, '\\$1');
}
