import { parseExecutorCliArgs } from '../executor/cliArgs.js';
import { runExecution } from '../orchestration/runExecution.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';

const EXECUTE_CLI_USAGE =
  'Usage: npm run tool:execute -- --form-artifact <path> --answer-plan-artifact <path> [--storage-state <path>] [--headed] [--headless] [--submit] [--dry-run] [--trace] [--no-trace] [--mock] [--cdp-endpoint <url>]';

function parseArgs(argv: string[]): ReturnType<typeof parseExecutorCliArgs> {
  const normalized: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--form-artifact') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --form-artifact');
      normalized.push(value);
      continue;
    }
    if (token === '--answer-plan-artifact') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --answer-plan-artifact');
      normalized.push(value);
      continue;
    }

    normalized.push(token);
  }

  return parseExecutorCliArgs(normalized);
}

export async function runExecuteCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv)) {
    stdout.write(`${EXECUTE_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseArgs(argv);
    const output = await runExecution({
      extractedFormArtifactPath: args.extractedFormPath,
      answerPlanArtifactPath: args.answerPlanPath,
      storageStatePath: args.storageStatePath,
      headless: args.headless,
      dryRun: args.dryRun,
      submit: args.attemptSubmit,
      traceEnabled: args.traceEnabled,
      cdpEndpoint: args.cdpEndpoint,
      mockMode: args.mockMode
    });

    writeJsonLine(
      buildSuccessEnvelope('execute', { execution_result_artifact_path: output.executionResultArtifactPath }, {
        execution_status: output.executionStatus
      }),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'execute'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runExecuteCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
