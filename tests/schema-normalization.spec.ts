import { test, expect } from '@playwright/test';
import { isExtractedFormResult } from '../playwright/schemas/validators.js';

test('accepts valid success payload shape', () => {
  const payload = {
    status: 'success',
    url: 'https://jobs.example.com/apply',
    ats: 'unknown',
    page_title: 'Apply - Example',
    current_step: 'Work experience',
    form_ready: true,
    submit_visible: true,
    submit_enabled: false,
    fields: [
      {
        field_id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        options: [],
        placeholder: 'you@example.com',
        help_text: null,
        section: 'Contact',
        current_value: null,
        selector_hint: '#email',
        visible: true,
        enabled: true,
        validation_text: null,
        semantic_category: 'contact_info',
        group_id: null,
        group_label: null,
        group_type: 'none',
        options_deferred: false,
        file_kind: 'unknown',
        sensitivity: 'none',
        auto_answer_safe: true,
        internal: false,
        source_tag: 'dom:input',
        name_attr: 'email',
        id_attr: 'email',
        aria_label: null
      }
    ],
    warnings: [],
    extracted_at: new Date().toISOString()
  };

  expect(isExtractedFormResult(payload)).toBeTruthy();
});

test('rejects malformed payload shape', () => {
  const payload = {
    status: 'success',
    fields: [{ type: 'not-a-valid-type' }]
  };

  expect(isExtractedFormResult(payload)).toBeFalsy();
});
