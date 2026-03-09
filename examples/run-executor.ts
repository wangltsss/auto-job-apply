import { resolve } from 'node:path';
import { runExecutor } from '../executor/index.js';

async function main(): Promise<void> {
  const extractedPath = process.argv[2] ?? resolve('examples/fixtures/extracted-form.sample.json');
  const answerPlanPath = process.argv[3] ?? resolve('examples/fixtures/answer-plan.sample.json');

  const submitFlag = process.argv.includes('--submit');
  const headedFlag = process.argv.includes('--headed');
  const realFlag = process.argv.includes('--real');

  const { result, artifactPath } = await runExecutor(extractedPath, answerPlanPath, {
    dryRun: !submitFlag,
    attemptSubmit: submitFlag,
    headless: !headedFlag,
    traceEnabled: true,
    mockMode: !realFlag
  });

  console.log(
    JSON.stringify(
      {
        status: result.status,
        failure_code: result.failure_code,
        artifactPath,
        submit_attempted: result.submit_attempted,
        submit_succeeded: result.submit_succeeded
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
