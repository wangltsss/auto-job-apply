import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { buildReasoningInput, readExtractedFormArtifact } from '../reasoning/buildReasoningInput.js';
import { enforceAnswerPlanPolicy } from '../reasoning/enforceAnswerPlanPolicy.js';
import { ReasoningBridgeError } from '../reasoning/errors.js';
import { parseAndValidateAnswerPlan } from '../reasoning/parseAnswerPlan.js';

test('buildReasoningInput keeps only reasoning-relevant field properties', async () => {
  const extracted = await readExtractedFormArtifact(resolve('examples/fixtures/extracted-form.sample.json'));
  const reasoning = buildReasoningInput({
    extractedForm: extracted,
    applicantProfile: { basics: { first_name: 'Taylor' } },
    policyFlags: {
      skip_demographic_questions_by_default: true,
      do_not_guess_ambiguous_questions: true,
      submit_only_if_safe: true,
      minimum_known_profile_confidence: 0.7,
      minimum_inferred_confidence: 0.85
    }
  });

  expect(reasoning.ats).toBe('greenhouse');
  expect(reasoning.application_url).toContain('jobs.example.test/apply/12345');
  expect(reasoning.fields[0]).toEqual(
    expect.objectContaining({
      field_id: 'first_name',
      semantic_category: 'personal_identity',
      sensitivity: 'none'
    })
  );
  expect(Object.keys(reasoning.fields[0] ?? {})).toEqual([
    'field_id',
    'label',
    'type',
    'required',
    'options',
    'options_deferred',
    'semantic_category',
    'sensitivity',
    'auto_answer_safe',
    'file_kind',
    'help_text',
    'section'
  ]);
});

test('parseAndValidateAnswerPlan rejects malformed JSON output', () => {
  expect(() => parseAndValidateAnswerPlan('not json at all')).toThrow(ReasoningBridgeError);

  try {
    parseAndValidateAnswerPlan('not json at all');
  } catch (error) {
    expect(error).toBeInstanceOf(ReasoningBridgeError);
    expect((error as ReasoningBridgeError).code).toBe('malformed_openclaw_json');
  }
});

test('parseAndValidateAnswerPlan rejects schema-invalid answer plan', async () => {
  const invalid = await readFile(resolve('tests/fixtures/openclaw-invalid-answer-plan.json'), 'utf-8');

  expect(() => parseAndValidateAnswerPlan(invalid)).toThrow(ReasoningBridgeError);

  try {
    parseAndValidateAnswerPlan(invalid);
  } catch (error) {
    expect((error as ReasoningBridgeError).code).toBe('answer_plan_schema_validation_failed');
  }
});

test('parseAndValidateAnswerPlan accepts valid answer plan', async () => {
  const valid = await readFile(resolve('examples/fixtures/valid-openclaw-response.json'), 'utf-8');
  const plan = parseAndValidateAnswerPlan(valid);

  expect(plan.status).toBe('quarantine');
  expect(plan.submit_allowed).toBeFalsy();
  expect(plan.answers.length).toBeGreaterThan(0);
  expect(plan.answers[0]?.provenance).toBeTruthy();
});

test('enforceAnswerPlanPolicy quarantines low-confidence inferred answers when safe submit is required', () => {
  const plan = enforceAnswerPlanPolicy(
    {
      status: 'proceed',
      reason: 'Looks good.',
      ats: 'greenhouse',
      application_url: 'https://jobs.example.test/apply/12345',
      submit_allowed: true,
      answers: [
        {
          field_id: 'location',
          answer_type: 'scalar',
          value: 'Toronto, ON',
          confidence: 0.7,
          rationale_short: 'Inferred from prior context.',
          requires_human_review: false,
          provenance: 'clawdbot_inferred'
        }
      ],
      ambiguous_fields: [],
      notes: [],
      generated_at: new Date().toISOString()
    },
    {
      skip_demographic_questions_by_default: true,
      do_not_guess_ambiguous_questions: true,
      submit_only_if_safe: true,
      minimum_known_profile_confidence: 0.7,
      minimum_inferred_confidence: 0.85
    }
  );

  expect(plan.status).toBe('quarantine');
  expect(plan.submit_allowed).toBeFalsy();
  expect(plan.reason).toContain('blocked autonomous submission');
});

test('enforceAnswerPlanPolicy preserves proceed when answers meet thresholds', () => {
  const plan = enforceAnswerPlanPolicy(
    {
      status: 'proceed',
      reason: 'Looks good.',
      ats: 'greenhouse',
      application_url: 'https://jobs.example.test/apply/12345',
      submit_allowed: true,
      answers: [
        {
          field_id: 'first_name',
          answer_type: 'scalar',
          value: 'Taylor',
          confidence: 0.95,
          rationale_short: 'Known profile fact.',
          requires_human_review: false,
          provenance: 'known_profile'
        },
        {
          field_id: 'location',
          answer_type: 'scalar',
          value: 'Toronto, ON',
          confidence: 0.9,
          rationale_short: 'Inferred from known context.',
          requires_human_review: false,
          provenance: 'clawdbot_inferred'
        }
      ],
      ambiguous_fields: [],
      notes: [],
      generated_at: new Date().toISOString()
    },
    {
      skip_demographic_questions_by_default: true,
      do_not_guess_ambiguous_questions: true,
      submit_only_if_safe: true,
      minimum_known_profile_confidence: 0.7,
      minimum_inferred_confidence: 0.85
    }
  );

  expect(plan.status).toBe('proceed');
  expect(plan.submit_allowed).toBeTruthy();
});
