import { expect, test } from '@playwright/test';
import { runPipeline } from '../orchestration/pipeline.js';

test('pipeline wires stages and propagates artifact paths on success', async () => {
  const out = await runPipeline(
    {
      mode: 'full',
      url: 'https://jobs.example.test/apply/12345'
    },
    {
      runScrape: async () => ({
        stage: 'scrape',
        scrapeArtifactPath: '/tmp/form.json',
        scrapeResult: {
          status: 'success',
          url: 'https://jobs.example.test/apply/12345',
          ats: 'greenhouse',
          page_title: 'Example',
          current_step: null,
          form_ready: true,
          submit_visible: true,
          submit_enabled: true,
          fields: [],
          warnings: [],
          extracted_at: new Date().toISOString()
        }
      }),
      runAnswerPlan: async () => ({
        stage: 'answer_plan',
        answerPlanArtifactPath: '/tmp/plan.json',
        answerPlanStatus: 'proceed'
      }),
      runExecution: async () => ({
        stage: 'execute',
        executionResultArtifactPath: '/tmp/exec.json',
        executionStatus: 'success'
      })
    }
  );

  expect(out.artifact.final_status).toBe('success');
  expect(out.artifact.scrape_artifact_path).toBe('/tmp/form.json');
  expect(out.artifact.answer_plan_artifact_path).toBe('/tmp/plan.json');
  expect(out.artifact.execution_result_artifact_path).toBe('/tmp/exec.json');
  expect(out.artifact.stages_run).toEqual(['scrape', 'answer_plan', 'execute']);
});

test('pipeline stops on failure and records failure stage/code', async () => {
  const out = await runPipeline(
    {
      mode: 'full',
      url: 'https://jobs.example.test/apply/12345'
    },
    {
      runScrape: async () => ({
        stage: 'scrape',
        scrapeArtifactPath: '/tmp/form.json',
        scrapeResult: {
          status: 'success',
          url: 'https://jobs.example.test/apply/12345',
          ats: 'greenhouse',
          page_title: 'Example',
          current_step: null,
          form_ready: true,
          submit_visible: true,
          submit_enabled: true,
          fields: [],
          warnings: [],
          extracted_at: new Date().toISOString()
        }
      }),
      runAnswerPlan: async () => {
        throw Object.assign(new Error('OpenClaw failed'), { code: 'openclaw_invocation_failure', stage: 'answer_plan', details: {} });
      }
    }
  );

  expect(out.artifact.final_status).toBe('error');
  expect(out.artifact.failure_stage).toBe('answer_plan');
  expect(out.artifact.failure_code).toBe('openclaw_invocation_failure');
  expect(out.artifact.execution_result_artifact_path).toBeNull();
});

test('scrape-only mode runs only scrape stage', async () => {
  const out = await runPipeline(
    {
      mode: 'scrape',
      url: 'https://jobs.example.test/apply/12345'
    },
    {
      runScrape: async () => ({
        stage: 'scrape',
        scrapeArtifactPath: '/tmp/form.json',
        scrapeResult: {
          status: 'success',
          url: 'https://jobs.example.test/apply/12345',
          ats: 'greenhouse',
          page_title: 'Example',
          current_step: null,
          form_ready: true,
          submit_visible: true,
          submit_enabled: true,
          fields: [],
          warnings: [],
          extracted_at: new Date().toISOString()
        }
      })
    }
  );

  expect(out.artifact.stages_run).toEqual(['scrape']);
  expect(out.artifact.answer_plan_artifact_path).toBeNull();
  expect(out.artifact.execution_result_artifact_path).toBeNull();
});

test('pipeline stops before execution when answer-plan status is quarantine', async () => {
  const out = await runPipeline(
    {
      mode: 'full',
      url: 'https://jobs.example.test/apply/12345',
      jobId: 'job_123'
    },
    {
      runScrape: async () => ({
        stage: 'scrape',
        scrapeArtifactPath: '/tmp/form.json',
        scrapeResult: {
          status: 'success',
          url: 'https://jobs.example.test/apply/12345',
          ats: 'greenhouse',
          page_title: 'Example',
          current_step: null,
          form_ready: true,
          submit_visible: true,
          submit_enabled: true,
          fields: [],
          warnings: [],
          extracted_at: new Date().toISOString()
        }
      }),
      runAnswerPlan: async () => ({
        stage: 'answer_plan',
        answerPlanArtifactPath: '/tmp/plan.json',
        answerPlanStatus: 'quarantine'
      }),
      runExecution: async () => {
        throw new Error('execution should not run');
      }
    }
  );

  expect(out.artifact.final_status).toBe('error');
  expect(out.artifact.failure_stage).toBe('answer_plan');
  expect(out.artifact.failure_code).toBe('answer_plan_status_quarantine');
  expect(out.artifact.answer_plan_status).toBe('quarantine');
  expect(out.artifact.execution_result_artifact_path).toBeNull();
});
