import { parseExecutorCliArgs } from '../executor/cliArgs.js';
import { runExecutor } from '../executor/index.js';

async function main(): Promise<void> {
  const parsed = parseExecutorCliArgs(process.argv.slice(2));

  const { result, artifactPath } = await runExecutor(parsed.extractedFormPath, parsed.answerPlanPath, {
    dryRun: parsed.dryRun,
    attemptSubmit: parsed.attemptSubmit,
    headless: parsed.headless,
    traceEnabled: parsed.traceEnabled,
    storageStatePath: parsed.storageStatePath,
    mockMode: parsed.mockMode,
    cdpEndpoint: parsed.cdpEndpoint
  });

  console.log(
    JSON.stringify(
      {
        status: result.status,
        failure_code: result.failure_code,
        artifactPath,
        submit_attempted: result.submit_attempted,
        submit_succeeded: result.submit_succeeded,
        current_url: result.current_url,
        headless: result.headless,
        storage_state_path: result.storage_state_path
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
