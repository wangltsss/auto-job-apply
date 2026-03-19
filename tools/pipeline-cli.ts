import { runPipeline } from '../orchestration/pipeline.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { parsePipelineCliArgs, PIPELINE_CLI_USAGE } from './pipelineCliArgs.js';

export async function runPipelineCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv)) {
    stdout.write(`${PIPELINE_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = await parsePipelineCliArgs(argv);

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

    if (out.artifact.final_status !== 'success') {
      writeJsonLine(
        {
          ok: false,
          stage: 'pipeline',
          code: out.artifact.failure_code ?? 'pipeline_failed',
          error: `Pipeline finished with status ${out.artifact.final_status}`,
          details: {
            pipeline_artifact_path: out.pipelineArtifactPath,
            failure_stage: out.artifact.failure_stage,
            notes: out.artifact.notes
          }
        },
        stderr
      );
      return 1;
    }

    writeJsonLine(
      buildSuccessEnvelope(
        'pipeline',
        {
          pipeline_artifact_path: out.pipelineArtifactPath,
          scrape_artifact_path: out.artifact.scrape_artifact_path,
          answer_plan_artifact_path: out.artifact.answer_plan_artifact_path,
          execution_result_artifact_path: out.artifact.execution_result_artifact_path
        },
        {
          final_status: out.artifact.final_status,
          stages_run: out.artifact.stages_run,
          failure_stage: out.artifact.failure_stage,
          failure_code: out.artifact.failure_code
        }
      ),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'pipeline'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runPipelineCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
