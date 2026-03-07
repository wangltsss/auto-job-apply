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
        validation_text: null
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
