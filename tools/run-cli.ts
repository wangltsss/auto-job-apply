import { readFile } from 'node:fs/promises';
import { getRun, listRuns, runController } from '../run-controller/index.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { parseRunCliArgs, RUN_CLI_USAGE } from './runCliArgs.js';

export async function runRunCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv) || argv.length === 0) {
    stdout.write(`${RUN_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseRunCliArgs(argv);

    if (args.command === 'start-run') {
      const applicantProfile = args.profilePath
        ? (JSON.parse(await readFile(args.profilePath, 'utf-8')) as Record<string, unknown>)
        : {};

      const output = await runController({
        targetSuccessCount: args.targetSuccessCount,
        jobPoolPath: args.jobPoolPath,
        runStorePath: args.runStorePath,
        activeRunLockPath: args.activeRunLockPath,
        ledgerStorePath: args.ledgerStorePath,
        applicantProfile,
        mockOpenClawRawOutputPath: args.mockResponsePath,
        storageStatePath: args.storageStatePath,
        headless: args.headless,
        traceEnabled: args.traceEnabled,
        dryRun: args.dryRun,
        submit: args.submit,
        cdpEndpoint: args.cdpEndpoint,
        mockExecution: args.mockExecution
      });

      writeJsonLine(
        buildSuccessEnvelope(
          'run',
          {},
          {
            command: 'start-run',
            run_store_path: output.runStorePath,
            run_id: output.runRecord.run_id,
            status: output.runRecord.status,
            target_success_count: output.runRecord.target_success_count,
            success_count: output.runRecord.success_count,
            attempt_count: output.runRecord.attempt_count,
            clarifications_required_count: output.runRecord.attempts.filter((attempt) =>
              attempt.notes.some((note) => note.includes('clarification'))
            ).length
          }
        ),
        stdout
      );
      return 0;
    }

    if (args.runId) {
      const run = await getRun(args.runId, args.runStorePath);
      writeJsonLine(
        buildSuccessEnvelope(
          'run',
          {},
          {
            command: 'query-run',
            found: Boolean(run),
            run
          }
        ),
        stdout
      );
      return run ? 0 : 1;
    }

    const runs = await listRuns({ status: args.status, limit: args.limit }, args.runStorePath);
    writeJsonLine(
      buildSuccessEnvelope(
        'run',
        {},
        {
          command: 'query-run',
          count: runs.length,
          runs
        }
      ),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'run'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runRunCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
