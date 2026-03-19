import { readFile } from 'node:fs/promises';
import { runAnswerPlan } from '../orchestration/runAnswerPlan.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { ANSWER_PLAN_CLI_USAGE, parseAnswerPlanCliArgs } from './answerPlanCliArgs.js';

export async function runAnswerPlanCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv)) {
    stdout.write(`${ANSWER_PLAN_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseAnswerPlanCliArgs(argv);
    const profile = args.profilePath ? (JSON.parse(await readFile(args.profilePath, 'utf-8')) as Record<string, unknown>) : {};

    const output = await runAnswerPlan({
      extractedFormArtifactPath: args.formArtifactPath,
      applicantProfile: profile,
      mockOpenClawRawOutputPath: args.mockResponsePath
    });

    writeJsonLine(
      buildSuccessEnvelope('answer_plan', { answer_plan_artifact_path: output.answerPlanArtifactPath }, {
        answer_plan_status: output.answerPlanStatus
      }),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'answer_plan'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runAnswerPlanCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
