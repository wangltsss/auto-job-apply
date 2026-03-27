import type { Locator, Page } from 'playwright';
import type { AtsType, ExtractedField, FieldType } from '../schemas/types.js';
import type { ExtractorResult, FormExtractor } from './base.js';
import { HELP_TEXT_SELECTORS, PRIMARY_FORM_SELECTORS, STEP_HINT_SELECTORS, VALIDATION_SELECTORS } from '../utils/selectors.js';
import { cleanText, nullIfEmpty } from '../utils/text.js';
import { inferFieldType, isLikelyRequired, isSubmitLike } from '../utils/formInference.js';
import { buildStableFieldId } from '../utils/fieldIdentity.js';
import {
  enrichWeakFileLabel,
  inferAutoAnswerSafe,
  inferFileKind,
  inferSemanticCategory,
  inferSensitivity
} from '../utils/fieldSemantics.js';
import { isInternalControl, shouldMarkOptionsDeferred } from '../utils/internalFieldPolicy.js';
import { deduplicateFields } from '../utils/fieldDedup.js';

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
  labelText: string | null;
  sectionText: string | null;
  helpText: string | null;
  validationText: string | null;
  selectorHint: string | null;
  optionTexts: string[];
  groupLabel: string | null;
  isMultiple: boolean;
  selectedValues: string[];
  sourceTag: string;
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
    const controls = container.locator('input:not([role="combobox"]), textarea, select, [role="combobox"]');
    const count = await controls.count();
    const fields: ExtractedField[] = [];
    const seenRadioGroups = new Set<string>();
    const seenCheckboxGroups = new Set<string>();

    for (let i = 0; i < count; i += 1) {
      const control = controls.nth(i);
      const snapshot = await this.snapshotControl(control);
      const visible = await control.isVisible().catch(() => false);
      const enabled = await control.isEnabled().catch(() => false);
      const fieldType = this.resolveFieldType(snapshot);

      const internal = isInternalControl({
        tagName: snapshot.tagName,
        typeAttr: snapshot.typeAttr,
        idAttr: snapshot.id,
        nameAttr: snapshot.name,
        ariaLabel: snapshot.ariaLabel,
        role: snapshot.role,
        visible
      });

      if (internal) {
        continue;
      }

      if (fieldType === 'radio') {
        const groupKey = snapshot.name ?? snapshot.id;
        if (!groupKey || seenRadioGroups.has(groupKey)) {
          continue;
        }
        seenRadioGroups.add(groupKey);
        fields.push(await this.buildRadioGroupField(container, snapshot, groupKey, i));
        continue;
      }

      if (fieldType === 'checkbox') {
        const checkboxGroupKey = await this.resolveCheckboxGroupKey(container, snapshot);
        if (checkboxGroupKey) {
          if (seenCheckboxGroups.has(checkboxGroupKey)) {
            continue;
          }
          seenCheckboxGroups.add(checkboxGroupKey);
          fields.push(await this.buildCheckboxGroupField(container, snapshot, checkboxGroupKey, i));
          continue;
        }
      }

      if (!snapshot.labelText && !snapshot.ariaLabel && fieldType === 'unknown') {
        continue;
      }

      const optionTexts =
        fieldType === 'combobox'
          ? await this.resolveComboboxOptions(control, snapshot)
          : snapshot.optionTexts;

      const baseLabel = cleanText(snapshot.labelText ?? snapshot.ariaLabel ?? snapshot.name ?? snapshot.id ?? 'Unknown field');
      const fileKind = fieldType === 'file'
        ? inferFileKind({
            label: baseLabel,
            section: snapshot.sectionText,
            helpText: snapshot.helpText,
            nameAttr: snapshot.name,
            idAttr: snapshot.id
          })
        : 'unknown';
      const label = fieldType === 'file' ? enrichWeakFileLabel(baseLabel, fileKind) : baseLabel;

      const semanticCategory = inferSemanticCategory({
        label,
        section: snapshot.sectionText,
        helpText: snapshot.helpText,
        nameAttr: snapshot.name,
        idAttr: snapshot.id,
        type: fieldType
      });
      const sensitivity = inferSensitivity(
        {
          label,
          section: snapshot.sectionText,
          helpText: snapshot.helpText,
          nameAttr: snapshot.name,
          idAttr: snapshot.id,
          type: fieldType
        },
        semanticCategory
      );
      const optionsDeferred = shouldMarkOptionsDeferred(fieldType, snapshot.optionTexts.length);

      fields.push({
        field_id: buildStableFieldId({
          nameAttr: snapshot.name,
          idAttr: snapshot.id,
          label,
          section: snapshot.sectionText,
          index: i
        }),
        label,
        type: fieldType,
        required: isLikelyRequired(label, snapshot.ariaRequired, snapshot.requiredAttr),
        options: optionTexts,
        placeholder: nullIfEmpty(snapshot.placeholder),
        help_text: nullIfEmpty(snapshot.helpText),
        section: nullIfEmpty(snapshot.sectionText),
        current_value: this.resolveCurrentValue(snapshot, fieldType),
        selector_hint: snapshot.selectorHint,
        visible,
        enabled,
        validation_text: nullIfEmpty(snapshot.validationText),
        semantic_category: semanticCategory,
        group_id: null,
        group_label: null,
        group_type: 'none',
        options_deferred: shouldMarkOptionsDeferred(fieldType, optionTexts.length),
        file_kind: fileKind,
        sensitivity,
        auto_answer_safe: inferAutoAnswerSafe(sensitivity),
        internal: false,
        source_tag: snapshot.sourceTag,
        name_attr: snapshot.name,
        id_attr: snapshot.id,
        aria_label: snapshot.ariaLabel
      });
    }

    return deduplicateFields(fields);
  }

  protected resolveFieldType(snapshot: ControlSnapshot): FieldType {
    if (snapshot.tagName === 'textarea') {
      return 'textarea';
    }
    if (snapshot.tagName === 'select') {
      return 'select';
    }

    return inferFieldType({
      inputType: snapshot.typeAttr,
      role: snapshot.role,
      nameAttr: snapshot.name,
      idAttr: snapshot.id,
      label: snapshot.labelText ?? snapshot.ariaLabel,
      sourceTag: snapshot.sourceTag
    });
  }

  protected async buildRadioGroupField(
    container: Locator,
    firstSnapshot: ControlSnapshot,
    groupKey: string,
    index: number
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

    const label = cleanText(firstSnapshot.groupLabel ?? firstSnapshot.labelText ?? firstSnapshot.ariaLabel ?? firstSnapshot.name ?? 'Radio group');
    const semanticCategory = inferSemanticCategory({
      label,
      section: firstSnapshot.sectionText,
      helpText: firstSnapshot.helpText,
      nameAttr: firstSnapshot.name,
      idAttr: firstSnapshot.id,
      type: 'radio'
    });
    const sensitivity = inferSensitivity(
      {
        label,
        section: firstSnapshot.sectionText,
        helpText: firstSnapshot.helpText,
        nameAttr: firstSnapshot.name,
        idAttr: firstSnapshot.id,
        type: 'radio'
      },
      semanticCategory
    );

    return {
      field_id: buildStableFieldId({
        nameAttr: firstSnapshot.name,
        idAttr: firstSnapshot.id,
        label,
        section: firstSnapshot.sectionText,
        index
      }),
      label,
      type: 'radio',
      required: isLikelyRequired(label, firstSnapshot.ariaRequired, firstSnapshot.requiredAttr),
      options,
      placeholder: null,
      help_text: nullIfEmpty(firstSnapshot.helpText),
      section: nullIfEmpty(firstSnapshot.sectionText),
      current_value: selected,
      selector_hint: firstSnapshot.selectorHint,
      visible,
      enabled,
      validation_text: nullIfEmpty(firstSnapshot.validationText),
      semantic_category: semanticCategory,
      group_id: firstSnapshot.name ?? firstSnapshot.id ?? null,
      group_label: nullIfEmpty(firstSnapshot.groupLabel ?? label),
      group_type: 'single_choice',
      options_deferred: shouldMarkOptionsDeferred('radio', options.length),
      file_kind: 'unknown',
      sensitivity,
      auto_answer_safe: inferAutoAnswerSafe(sensitivity),
      internal: false,
      source_tag: 'radio_group',
      name_attr: firstSnapshot.name,
      id_attr: firstSnapshot.id,
      aria_label: firstSnapshot.ariaLabel
    };
  }

  protected async buildCheckboxGroupField(
    container: Locator,
    firstSnapshot: ControlSnapshot,
    groupKey: string,
    index: number
  ): Promise<ExtractedField> {
    const checkboxes =
      firstSnapshot.name
        ? container.locator(`input[type="checkbox"][name="${cssEscape(firstSnapshot.name)}"]`)
        : container.locator(`input[type="checkbox"]#${cssEscape(groupKey)}`);
    const checkboxCount = await checkboxes.count();
    const options: string[] = [];
    const selected: string[] = [];
    let visible = false;
    let enabled = false;

    for (let i = 0; i < checkboxCount; i += 1) {
      const checkbox = checkboxes.nth(i);
      const shot = await this.snapshotControl(checkbox);
      const label = cleanText(shot.labelText ?? shot.ariaLabel ?? shot.value ?? `Option ${i + 1}`);
      if (label) {
        options.push(label);
      }
      if (shot.checked && label) {
        selected.push(label);
      }
      visible = visible || (await checkbox.isVisible().catch(() => false));
      enabled = enabled || (await checkbox.isEnabled().catch(() => false));
    }

    const label = cleanText(firstSnapshot.groupLabel ?? firstSnapshot.labelText ?? firstSnapshot.ariaLabel ?? firstSnapshot.name ?? 'Checkbox group');
    const semanticCategory = inferSemanticCategory({
      label,
      section: firstSnapshot.sectionText,
      helpText: firstSnapshot.helpText,
      nameAttr: firstSnapshot.name,
      idAttr: firstSnapshot.id,
      type: 'checkbox'
    });
    const sensitivity = inferSensitivity(
      {
        label,
        section: firstSnapshot.sectionText,
        helpText: firstSnapshot.helpText,
        nameAttr: firstSnapshot.name,
        idAttr: firstSnapshot.id,
        type: 'checkbox'
      },
      semanticCategory
    );

    return {
      field_id: buildStableFieldId({
        nameAttr: firstSnapshot.name,
        idAttr: firstSnapshot.id,
        label,
        section: firstSnapshot.sectionText,
        index
      }),
      label,
      type: 'checkbox',
      required: isLikelyRequired(label, firstSnapshot.ariaRequired, firstSnapshot.requiredAttr),
      options,
      placeholder: null,
      help_text: nullIfEmpty(firstSnapshot.helpText),
      section: nullIfEmpty(firstSnapshot.sectionText),
      current_value: selected,
      selector_hint: firstSnapshot.name ? `[name="${firstSnapshot.name}"]` : firstSnapshot.selectorHint,
      visible,
      enabled,
      validation_text: nullIfEmpty(firstSnapshot.validationText),
      semantic_category: semanticCategory,
      group_id: firstSnapshot.name ?? firstSnapshot.id ?? null,
      group_label: nullIfEmpty(firstSnapshot.groupLabel ?? label),
      group_type: 'multi_choice',
      options_deferred: shouldMarkOptionsDeferred('checkbox', options.length),
      file_kind: 'unknown',
      sensitivity,
      auto_answer_safe: inferAutoAnswerSafe(sensitivity),
      internal: false,
      source_tag: 'checkbox_group',
      name_attr: firstSnapshot.name,
      id_attr: firstSnapshot.id,
      aria_label: firstSnapshot.ariaLabel
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
      const value = 'value' in element ? (element as HTMLInputElement).value : null;
      const checked = 'checked' in element ? Boolean((element as HTMLInputElement).checked) : null;
      const sourceTag = role === 'combobox' ? 'combobox_widget' : `dom:${tagName}`;

      const labels = 'labels' in element && element.labels ? Array.from(element.labels) : [];
      const labelFromLabels = labels.map((label) => label.textContent ?? '').join(' ').trim();
      const labelFromFor = id
        ? (document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? '').trim()
        : '';
      const fieldContainer = element.closest('fieldset, .field, .application-question, .jobs-easy-apply-form-section__grouping');
      const legendText = fieldContainer?.querySelector('legend')?.textContent?.trim() ?? '';
      const labelText = labelFromLabels || labelFromFor || legendText || null;

      const sectionNode = fieldContainer?.closest('section, .application-section, .jobs-easy-apply-form-section')
        ?.querySelector('h2, h3, legend, .header, .title');

      const helpText = args.helpSelectors
        .map((selector: string) => fieldContainer?.querySelector(selector)?.textContent?.trim() ?? '')
        .find((text: string) => text.length > 0) || null;

      const validationText = args.validationSelectors
        .map((selector: string) => fieldContainer?.querySelector(selector)?.textContent?.trim() ?? '')
        .find((text: string) => text.length > 0) || null;

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

      const dataListId = element.getAttribute('list');
      if (dataListId) {
        const list = document.getElementById(dataListId);
        const entries = list?.querySelectorAll('option') ?? [];
        entries.forEach((entry) => {
          const text = entry.textContent?.trim() || (entry as HTMLOptionElement).value?.trim();
          if (text) {
            optionTexts.push(text);
          }
        });
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

      const uniqueOptionTexts = Array.from(new Set(optionTexts));

      const isMultiple = element instanceof HTMLSelectElement && element.multiple;
      const selectedValues = isMultiple
        ? Array.from((element as HTMLSelectElement).selectedOptions).map((option) => option.value)
        : [];

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
        labelText,
        sectionText: sectionNode?.textContent?.trim() ?? null,
        helpText,
        validationText,
        selectorHint,
        optionTexts: uniqueOptionTexts,
        groupLabel: legendText || null,
        isMultiple,
        selectedValues,
        sourceTag
      };
    }, { helpSelectors: HELP_TEXT_SELECTORS, validationSelectors: VALIDATION_SELECTORS });
  }

  protected async resolveCheckboxGroupKey(container: Locator, snapshot: ControlSnapshot): Promise<string | null> {
    if (snapshot.typeAttr?.toLowerCase() !== 'checkbox') {
      return null;
    }

    if (snapshot.name) {
      const count = await container.locator(`input[type="checkbox"][name="${cssEscape(snapshot.name)}"]`).count().catch(() => 0);
      if (count > 1) {
        return snapshot.name;
      }
    }

    if (snapshot.groupLabel && snapshot.id) {
      return snapshot.id;
    }

    return null;
  }

  protected async resolveComboboxOptions(control: Locator, snapshot: ControlSnapshot): Promise<string[]> {
    if (snapshot.optionTexts.length > 0 || snapshot.role !== 'combobox') {
      return snapshot.optionTexts;
    }

    const controlWrapper = control.locator('xpath=ancestor::*[contains(@class, "select__control")][1]').first();
    if (await controlWrapper.count()) {
      await controlWrapper.click().catch(() => undefined);
    } else {
      await control.click().catch(() => undefined);
    }

    await control.focus().catch(() => undefined);
    await control.press('ArrowDown').catch(() => undefined);

    let optionTexts: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      optionTexts = await control.evaluate((node) => {
        const element = node as HTMLInputElement;
        const controlId = element.id;
        const explicitListboxId = element.getAttribute('aria-controls');
        const candidateIds: string[] = [];
        if (explicitListboxId) {
          candidateIds.push(explicitListboxId);
        }
        if (controlId) {
          candidateIds.push(`react-select-${controlId}-listbox`);
        }

        const seen = new Set<string>();
        const texts: string[] = [];

        for (const listboxId of candidateIds) {
          const listbox = document.getElementById(listboxId);
          const options = listbox?.querySelectorAll('[role="option"]') ?? [];
          for (const option of options) {
            const cleaned = option.textContent?.trim();
            if (!cleaned || seen.has(cleaned)) {
              continue;
            }
            seen.add(cleaned);
            texts.push(cleaned);
          }
        }

        if (texts.length === 0 && controlId) {
          const fallbackOptions = document.querySelectorAll(`[id^="react-select-${controlId}-option-"]`);
          for (const option of fallbackOptions) {
            const cleaned = option.textContent?.trim();
            if (!cleaned || seen.has(cleaned)) {
              continue;
            }
            seen.add(cleaned);
            texts.push(cleaned);
          }
        }

        return texts;
      }).catch(() => []);

      if (optionTexts.length > 0) {
        break;
      }

      await control.page().waitForTimeout(125).catch(() => undefined);
      await control.press('ArrowDown').catch(() => undefined);
    }

    await control.press('Escape').catch(() => undefined);
    return optionTexts;
  }

  protected async detectSubmitState(container: Locator): Promise<{ visible: boolean; enabled: boolean }> {
    const buttons = container.locator('button, input[type="submit"], [role="button"]');
    const count = await buttons.count();

    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i);
      const text = await button.innerText().catch(() => '');
      const value = await button.getAttribute('value').catch(() => '');
      const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
      const title = await button.getAttribute('title').catch(() => '');
      const automationId = await button.getAttribute('data-automation-id').catch(() => '');
      const label = cleanText(text || value || ariaLabel || title || automationId || '');
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

  protected resolveCurrentValue(snapshot: ControlSnapshot, type: FieldType): string | boolean | string[] | null {
    if (type === 'checkbox') {
      return Boolean(snapshot.checked);
    }
    if (type === 'file') {
      return null;
    }
    if ((type === 'select' || type === 'combobox') && snapshot.isMultiple) {
      return snapshot.selectedValues;
    }
    return nullIfEmpty(snapshot.value);
  }
}

function cssEscape(value: string): string {
  return value.replace(/(["\\.#:[\]])/g, '\\$1');
}
