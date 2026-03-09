import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { getHandlerName } from '../executor/dispatch.js';
import { ExecutorError } from '../executor/errors.js';
import { buildSelectorCandidatesForField } from '../executor/fieldResolvers.js';
import { runExecutor } from '../executor/index.js';
import { loadExecutionInputs } from '../executor/loadExecutionInputs.js';
import { submitFlow } from '../executor/submitFlow.js';
import { writeExecutionArtifact } from '../executor/writeExecutionArtifact.js';
import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import type { ExtractedField } from '../playwright/schemas/types.js';

test('loadExecutionInputs fails when answer plan references unknown field', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'executor-mismatch-'));

  try {
    const extracted = await readFile(resolve('examples/fixtures/extracted-form.sample.json'), 'utf-8');
    const planRaw = await readFile(resolve('examples/fixtures/answer-plan.sample.json'), 'utf-8');
    const plan = JSON.parse(planRaw) as AnswerPlan;
    plan.answers[0]!.field_id = 'not_present';

    const extractedPath = join(tempDir, 'extracted.json');
    const planPath = join(tempDir, 'plan.json');

    await writeFile(extractedPath, extracted, 'utf-8');
    await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf-8');

    await expect(loadExecutionInputs(extractedPath, planPath)).rejects.toBeInstanceOf(ExecutorError);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('submitFlow refuses submit when policy is not proceed', async () => {
  const answerPlan = JSON.parse(await readFile(resolve('examples/fixtures/valid-openclaw-response.json'), 'utf-8')) as AnswerPlan;
  const fakePage = {} as never;

  await expect(submitFlow(fakePage, answerPlan, { dryRun: false, attemptSubmit: true })).rejects.toMatchObject({
    code: 'submit_blocked_by_policy'
  });
});

test('handler dispatch map covers all answer types', () => {
  expect(getHandlerName('scalar')).toBe('applyScalar');
  expect(getHandlerName('option')).toBe('applyOption');
  expect(getHandlerName('multi_select')).toBe('applyMultiSelect');
  expect(getHandlerName('file_action')).toBe('applyFileAction');
  expect(getHandlerName('skip')).toBe('applySkip');
});

test('field resolver candidate precedence is deterministic', () => {
  const field: ExtractedField = {
    field_id: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    options: [],
    placeholder: null,
    help_text: null,
    section: null,
    current_value: null,
    selector_hint: '[data-test="primary-email"]',
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
    aria_label: 'Email'
  };

  const selectors = buildSelectorCandidatesForField(field);
  expect(selectors.map((item) => item.strategy)).toEqual(['selector_hint', 'id_attr', 'name_attr', 'aria_label']);
});

test('writeExecutionArtifact writes machine-readable file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'execution-artifact-'));

  try {
    const path = await writeExecutionArtifact(
      {
        status: 'success',
        application_url: 'https://job-boards.greenhouse.io/example/jobs/12345',
        ats: 'greenhouse',
        extracted_form_path: '/tmp/extracted.json',
        answer_plan_path: '/tmp/plan.json',
        started_at: '2026-03-09T12:00:00.000Z',
        ended_at: '2026-03-09T12:00:10.000Z',
        applied_actions: [],
        skipped_fields: [],
        failed_fields: [],
        screenshots: [],
        trace_path: null,
        submit_attempted: false,
        submit_succeeded: false,
        failure_code: null,
        notes: ['ok']
      },
      tempDir
    );

    const content = await readFile(path, 'utf-8');
    const parsed = JSON.parse(content) as { status: string; notes: string[] };
    expect(parsed.status).toBe('success');
    expect(parsed.notes).toEqual(['ok']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('mocked dry-run executor produces execution result artifact', async () => {
  const { result, artifactPath } = await runExecutor(
    resolve('examples/fixtures/extracted-form.sample.json'),
    resolve('examples/fixtures/answer-plan.sample.json'),
    {
      dryRun: true,
      attemptSubmit: false,
      mockMode: true,
      traceEnabled: false
    }
  );

  expect(result.status).toBe('success');
  expect(result.submit_attempted).toBeFalsy();
  expect(result.applied_actions.length).toBeGreaterThan(0);
  const content = await readFile(artifactPath, 'utf-8');
  expect(JSON.parse(content).status).toBe('success');
});
