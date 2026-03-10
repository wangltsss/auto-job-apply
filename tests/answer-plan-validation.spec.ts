import { test, expect } from '@playwright/test';
import { isAnswerPlan } from '../playwright/schemas/answerPlanValidators.js';

test('accepts valid proceed answer plan', () => {
  const payload = {
    status: 'proceed',
    reason: 'All required fields mapped with high confidence.',
    ats: 'greenhouse',
    application_url: 'https://jobs.example.test/apply/123',
    submit_allowed: true,
    answers: [
      {
        field_id: 'first_name',
        answer_type: 'scalar',
        value: 'Taylor',
        confidence: 0.99,
        rationale_short: 'Direct profile match.',
        requires_human_review: false
      },
      {
        field_id: 'work_auth',
        answer_type: 'option',
        value: 'Yes',
        confidence: 0.96,
        rationale_short: 'Known eligibility status.',
        requires_human_review: false
      },
      {
        field_id: 'resume_upload',
        answer_type: 'file_action',
        value: {
          action: 'upload',
          file_path: '/home/shawn/Documents/auto-apply/assets/resume-tailored.pdf',
          file_kind: 'resume'
        },
        confidence: 0.93,
        rationale_short: 'Use latest tailored resume.',
        requires_human_review: false
      }
    ],
    ambiguous_fields: [],
    notes: ['No conflicts detected.'],
    generated_at: new Date().toISOString()
  };

  expect(isAnswerPlan(payload)).toBeTruthy();
});

test('rejects malformed answer plan', () => {
  const payload = {
    status: 'proceed',
    reason: 'bad type for confidence',
    ats: 'unknown',
    application_url: 'https://example.com/apply',
    submit_allowed: true,
    answers: [
      {
        field_id: 'email',
        answer_type: 'scalar',
        value: 'test@example.com',
        confidence: 1.5,
        rationale_short: 'Invalid confidence range.',
        requires_human_review: false
      }
    ],
    ambiguous_fields: [],
    notes: [],
    generated_at: new Date().toISOString()
  };

  expect(isAnswerPlan(payload)).toBeFalsy();
});
