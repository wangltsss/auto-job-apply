import { parseExecutorCliArgs } from '../executor/cliArgs.js';
import { runExecution } from '../orchestration/runExecution.js';

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

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
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

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        stage: output.stage,
        execution_result_artifact_path: output.executionResultArtifactPath,
        execution_status: output.executionStatus
      })}\n`
    );
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}

main();
