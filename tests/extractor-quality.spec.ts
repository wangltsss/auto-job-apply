import { expect, test } from '@playwright/test';
import { buildStableFieldId } from '../playwright/utils/fieldIdentity.js';
import { inferAutoAnswerSafe, inferFileKind, inferSemanticCategory, inferSensitivity } from '../playwright/utils/fieldSemantics.js';
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
      section: 'Cover Letter',
      helpText: null,
      nameAttr: 'cover_letter',
      idAttr: 'cover_letter'
    })
  ).toBe('cover_letter');
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
