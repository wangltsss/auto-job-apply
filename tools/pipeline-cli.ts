import { readFile } from 'node:fs/promises';
import { runPipeline } from '../orchestration/pipeline.js';
import type { PipelineMode } from '../orchestration/types.js';

interface Args {
  url: string;
  mode: PipelineMode;
  storageStatePath?: string;
  headless: boolean;
  traceEnabled: boolean;
  dryRun: boolean;
  submit: boolean;
  cdpEndpoint?: string;
  mockOpenClawRawOutputPath?: string;
  mockExecution: boolean;
  applicantProfile: Record<string, unknown>;
}

async function parseArgs(argv: string[]): Promise<Args> {
  let url = '';
  let mode: PipelineMode = 'full';
  let storageStatePath: string | undefined;
  let headless = true;
  let traceEnabled = true;
  let dryRun = true;
  let submit = false;
  let cdpEndpoint: string | undefined;
  let mockOpenClawRawOutputPath: string | undefined;
  let mockExecution = false;
  let profilePath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--url') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --url');
      url = value;
      continue;
    }
    if (token === '--mode') {
      const value = argv[++i] as PipelineMode | undefined;
      if (!value || !['scrape', 'scrape-answer-plan', 'full'].includes(value)) {
        throw new Error('Invalid --mode, expected scrape|scrape-answer-plan|full');
      }
      mode = value;
      continue;
    }
    if (token === '--storage-state') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --storage-state');
      storageStatePath = value;
      continue;
    }
    if (token === '--profile') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --profile');
      profilePath = value;
      continue;
    }
    if (token === '--mock-response') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --mock-response');
      mockOpenClawRawOutputPath = value;
      continue;
    }
    if (token === '--cdp-endpoint') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --cdp-endpoint');
      cdpEndpoint = value;
      continue;
    }
    if (token === '--headed') {
      headless = false;
      continue;
    }
    if (token === '--headless') {
      headless = true;
      continue;
    }
    if (token === '--trace') {
      traceEnabled = true;
      continue;
    }
    if (token === '--no-trace') {
      traceEnabled = false;
      continue;
    }
    if (token === '--submit') {
      submit = true;
      dryRun = false;
      continue;
    }
    if (token === '--dry-run') {
      dryRun = true;
      submit = false;
      continue;
    }
    if (token === '--mock-execution') {
      mockExecution = true;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  if (!url) {
    throw new Error('Missing required --url');
  }

  const applicantProfile = profilePath ? (JSON.parse(await readFile(profilePath, 'utf-8')) as Record<string, unknown>) : {};

  return {
    url,
    mode,
    storageStatePath,
    headless,
    traceEnabled,
    dryRun,
    submit,
    cdpEndpoint,
    mockOpenClawRawOutputPath,
    mockExecution,
    applicantProfile
  };
}

async function main(): Promise<void> {
  try {
    const args = await parseArgs(process.argv.slice(2));

    const out = await runPipeline({
      mode: args.mode,
      url: args.url,
      storageStatePath: args.storageStatePath,
      headless: args.headless,
      traceEnabled: args.traceEnabled,
      applicantProfile: args.applicantProfile,
      mockOpenClawRawOutputPath: args.mockOpenClawRawOutputPath,
      dryRun: args.dryRun,
      submit: args.submit,
      cdpEndpoint: args.cdpEndpoint,
      mockExecution: args.mockExecution
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        pipeline_artifact_path: out.pipelineArtifactPath,
        final_status: out.artifact.final_status,
        scrape_artifact_path: out.artifact.scrape_artifact_path,
        answer_plan_artifact_path: out.artifact.answer_plan_artifact_path,
        execution_result_artifact_path: out.artifact.execution_result_artifact_path
      })}\n`
    );
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}

main();
