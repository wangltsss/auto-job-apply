import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { ExtractedField } from '../playwright/schemas/types.js';
import { deduplicateFields } from '../playwright/utils/fieldDedup.js';
import { buildStableFieldId } from '../playwright/utils/fieldIdentity.js';
import { inferAutoAnswerSafe, inferFileKind, inferSemanticCategory, inferSensitivity } from '../playwright/utils/fieldSemantics.js';
import { inferFieldType } from '../playwright/utils/formInference.js';
import { isInternalControl, shouldMarkOptionsDeferred } from '../playwright/utils/internalFieldPolicy.js';

test('marks iti search helper as internal control', () => {
  expect(
    isInternalControl({
      tagName: 'input',
      typeAttr: 'search',
      idAttr: 'iti-0__search-input',
      nameAttr: null,
      ariaLabel: 'Search',
      role: 'combobox',
      visible: true
    })
  ).toBeTruthy();
});

test('infers file kind for resume and cover letter', () => {
  expect(
    inferFileKind({
      label: 'Attach',
      section: 'Resume',
      helpText: null,
      nameAttr: 'resume',
      idAttr: 'resume'
    })
  ).toBe('resume');

  expect(
    inferFileKind({
      label: 'Attach',
      section: null,
      helpText: null,
      nameAttr: null,
      idAttr: 'cover_letter'
    })
  ).toBe('cover_letter');
});

test('classifies location semantics as contact info', () => {
  expect(
    inferSemanticCategory({
      label: 'Country',
      section: null,
      helpText: null,
      nameAttr: 'country',
      idAttr: 'country',
      type: 'combobox'
    })
  ).toBe('contact_info');
});

test('classifies commute/hybrid availability semantics as unknown', () => {
  expect(
    inferSemanticCategory({
      label: 'Commute preference',
      section: null,
      helpText: null,
      nameAttr: 'commute_preference',
      idAttr: null,
      type: 'select'
    })
  ).toBe('unknown');
});

test('classifies legal work authorization semantics correctly', () => {
  expect(
    inferSemanticCategory({
      label: 'Are you legally authorized to work in the job location?',
      section: null,
      helpText: null,
      nameAttr: null,
      idAttr: 'question_auth',
      type: 'combobox'
    })
  ).toBe('work_authorization');
});

test('marks demographic fields as sensitive and not auto-safe', () => {
  const semantic = inferSemanticCategory({
    label: 'Gender identity',
    section: 'Equal Employment Opportunity',
    helpText: null,
    nameAttr: 'gender',
    idAttr: 'gender',
    type: 'select'
  });
  const sensitivity = inferSensitivity(
    {
      label: 'Gender identity',
      section: 'Equal Employment Opportunity',
      helpText: null,
      nameAttr: 'gender',
      idAttr: 'gender',
      type: 'select'
    },
    semantic
  );

  expect(semantic).toBe('demographic');
  expect(sensitivity).toBe('demographic');
  expect(inferAutoAnswerSafe(sensitivity)).toBeFalsy();
});

test('marks unresolved combobox options as deferred', () => {
  expect(shouldMarkOptionsDeferred('combobox', 0)).toBeTruthy();
  expect(shouldMarkOptionsDeferred('select', 0)).toBeTruthy();
  expect(shouldMarkOptionsDeferred('combobox', 3)).toBeFalsy();
});

test('infers combobox from widget source evidence', () => {
  expect(
    inferFieldType({
      inputType: 'text',
      role: null,
      nameAttr: 'country',
      idAttr: 'country',
      label: 'Country',
      sourceTag: 'combobox_widget'
    })
  ).toBe('combobox');
});

test('buildStableFieldId follows precedence and is deterministic', () => {
  const fromName = buildStableFieldId({
    nameAttr: 'candidate[email]',
    idAttr: 'email',
    label: 'Email',
    section: 'Contact',
    index: 0
  });
  const fromId = buildStableFieldId({
    nameAttr: null,
    idAttr: 'email_input',
    label: 'Email',
    section: 'Contact',
    index: 1
  });
  const fromLabel = buildStableFieldId({
    nameAttr: null,
    idAttr: null,
    label: 'Email Address',
    section: 'Contact',
    index: 2
  });

  expect(fromName).toBe('candidate_email');
  expect(fromId).toBe('email_input');
  expect(fromLabel).toBe('email_address');
  expect(
    buildStableFieldId({
      nameAttr: null,
      idAttr: null,
      label: 'Email Address',
      section: 'Contact',
      index: 2
    })
  ).toBe(fromLabel);
});

test('deduplicates greenhouse duplicate phone fields and keeps strongest record', () => {
  const fixturePath = path.resolve('tests/fixtures/greenhouse-problematic-fields.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as {
    fields: ExtractedField[];
  };

  const deduped = deduplicateFields(fixture.fields);
  const phones = deduped.filter((field) => field.field_id === 'phone');
  const country = deduped.find((field) => field.field_id === 'country');

  expect(phones).toHaveLength(1);
  expect(phones[0]?.type).toBe('tel');
  expect(phones[0]?.selector_hint).toBe('#phone');
  expect(country?.type).toBe('combobox');
  expect(country?.options_deferred).toBeTruthy();
});
