import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { buildOpenClawInvocation } from '../reasoning/runOpenClaw.js';
import { buildReasoningInput, readExtractedFormArtifact } from '../reasoning/buildReasoningInput.js';
import { enforceAnswerPlanPolicy } from '../reasoning/enforceAnswerPlanPolicy.js';
import { ReasoningBridgeError } from '../reasoning/errors.js';
import { parseAndValidateAnswerPlan } from '../reasoning/parseAnswerPlan.js';

test('buildOpenClawInvocation defaults to agent routing when OPENCLAW_AGENT_ID is set', () => {
  const previous = process.env.OPENCLAW_AGENT_ID;
  process.env.OPENCLAW_AGENT_ID = 'agent_main';

  try {
    expect(buildOpenClawInvocation('hello')).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--agent', 'agent_main', '--message', 'hello'],
      stdinPrompt: false
    });
  } finally {
    if (previous === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previous;
    }
  }
});

test('buildOpenClawInvocation prefers explicit routing options over environment fallbacks', () => {
  const previousAgent = process.env.OPENCLAW_AGENT_ID;
  process.env.OPENCLAW_AGENT_ID = 'agent_env';

  try {
    expect(
      buildOpenClawInvocation('hello', {
        agent: 'agent_option'
      })
    ).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--agent', 'agent_option', '--message', 'hello'],
      stdinPrompt: false
    });

    expect(
      buildOpenClawInvocation('hello', {
        sessionId: 'session_option'
      })
    ).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--agent', 'agent_env', '--message', 'hello'],
      stdinPrompt: false
    });
  } finally {
    if (previousAgent === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previousAgent;
    }
  }
});

test('buildOpenClawInvocation falls back to session routing when agent routing is unavailable', () => {
  const previousAgent = process.env.OPENCLAW_AGENT_ID;
  const previousSession = process.env.OPENCLAW_SESSION_ID;
  delete process.env.OPENCLAW_AGENT_ID;
  process.env.OPENCLAW_SESSION_ID = 'session_123';

  try {
    expect(buildOpenClawInvocation('hello')).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--session-id', 'session_123', '--message', 'hello'],
      stdinPrompt: false
    });
  } finally {
    if (previousAgent === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previousAgent;
    }

    if (previousSession === undefined) {
      delete process.env.OPENCLAW_SESSION_ID;
    } else {
      process.env.OPENCLAW_SESSION_ID = previousSession;
    }
  }
});

test('buildOpenClawInvocation falls back to to routing when agent and session routing are unavailable', () => {
  const previousAgent = process.env.OPENCLAW_AGENT_ID;
  const previousSession = process.env.OPENCLAW_SESSION_ID;
  const previousTo = process.env.OPENCLAW_TO;
  delete process.env.OPENCLAW_AGENT_ID;
  delete process.env.OPENCLAW_SESSION_ID;
  process.env.OPENCLAW_TO = 'telegram:ops';

  try {
    expect(buildOpenClawInvocation('hello')).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--to', 'telegram:ops', '--message', 'hello'],
      stdinPrompt: false
    });
  } finally {
    if (previousAgent === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previousAgent;
    }

    if (previousSession === undefined) {
      delete process.env.OPENCLAW_SESSION_ID;
    } else {
      process.env.OPENCLAW_SESSION_ID = previousSession;
    }

    if (previousTo === undefined) {
      delete process.env.OPENCLAW_TO;
    } else {
      process.env.OPENCLAW_TO = previousTo;
    }
  }
});

test('buildOpenClawInvocation supports explicit sessionId and to routing options', () => {
  const previousAgent = process.env.OPENCLAW_AGENT_ID;
  const previousSession = process.env.OPENCLAW_SESSION_ID;
  const previousTo = process.env.OPENCLAW_TO;
  delete process.env.OPENCLAW_AGENT_ID;
  delete process.env.OPENCLAW_SESSION_ID;
  delete process.env.OPENCLAW_TO;

  try {
    expect(
      buildOpenClawInvocation('hello', {
        sessionId: 'session_option'
      })
    ).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--session-id', 'session_option', '--message', 'hello'],
      stdinPrompt: false
    });

    expect(
      buildOpenClawInvocation('hello', {
        to: 'telegram:ops'
      })
    ).toEqual({
      command: 'openclaw',
      args: ['agent', '--local', '--to', 'telegram:ops', '--message', 'hello'],
      stdinPrompt: false
    });
  } finally {
    if (previousAgent === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previousAgent;
    }

    if (previousSession === undefined) {
      delete process.env.OPENCLAW_SESSION_ID;
    } else {
      process.env.OPENCLAW_SESSION_ID = previousSession;
    }

    if (previousTo === undefined) {
      delete process.env.OPENCLAW_TO;
    } else {
      process.env.OPENCLAW_TO = previousTo;
    }
  }
});

test('buildOpenClawInvocation throws before spawn when routing is missing', () => {
  const previousAgent = process.env.OPENCLAW_AGENT_ID;
  const previousSession = process.env.OPENCLAW_SESSION_ID;
  const previousTo = process.env.OPENCLAW_TO;
  delete process.env.OPENCLAW_AGENT_ID;
  delete process.env.OPENCLAW_SESSION_ID;
  delete process.env.OPENCLAW_TO;

  try {
    expect(() => buildOpenClawInvocation('hello')).toThrow(ReasoningBridgeError);

    try {
      buildOpenClawInvocation('hello');
    } catch (error) {
      expect((error as ReasoningBridgeError).code).toBe('openclaw_invocation_failure');
      expect((error as ReasoningBridgeError).message).toContain('routing is missing');
    }
  } finally {
    if (previousAgent === undefined) {
      delete process.env.OPENCLAW_AGENT_ID;
    } else {
      process.env.OPENCLAW_AGENT_ID = previousAgent;
    }

    if (previousSession === undefined) {
      delete process.env.OPENCLAW_SESSION_ID;
    } else {
      process.env.OPENCLAW_SESSION_ID = previousSession;
    }

    if (previousTo === undefined) {
      delete process.env.OPENCLAW_TO;
    } else {
      process.env.OPENCLAW_TO = previousTo;
    }
  }
});

test('buildOpenClawInvocation supports prompt placeholders and stdin override', () => {
  expect(
    buildOpenClawInvocation('hello', {
      command: 'openclaw',
      args: ['message', '{prompt}', '--json']
    })
  ).toEqual({
    command: 'openclaw',
    args: ['message', 'hello', '--json'],
    stdinPrompt: false
  });

  expect(
    buildOpenClawInvocation('hello', {
      args: ['agent', '--stdin'],
      stdinPrompt: true
    })
  ).toEqual({
    command: 'openclaw',
    args: ['agent', '--stdin'],
    stdinPrompt: true
  });
});

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
