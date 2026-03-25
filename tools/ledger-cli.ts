import { queryLedger } from '../application-ledger/index.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { LEDGER_CLI_USAGE, parseLedgerCliArgs } from './ledgerCliArgs.js';

function mapCommandToQuery(command: ReturnType<typeof parseLedgerCliArgs>['command']): 'attempts' | 'successes' | 'failures' | 'clarifications' {
  switch (command) {
    case 'list-attempts':
      return 'attempts';
    case 'list-successes':
      return 'successes';
    case 'list-failures':
      return 'failures';
    case 'list-clarifications':
      return 'clarifications';
  }
}

export async function runLedgerCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv) || argv.length === 0) {
    stdout.write(`${LEDGER_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseLedgerCliArgs(argv);
    const kind = mapCommandToQuery(args.command);
    const records = await queryLedger(kind, args.storePath);

    writeJsonLine(
      buildSuccessEnvelope(
        'ledger',
        {},
        {
          command: args.command,
          count: records.length,
          records
        }
      ),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'ledger'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runLedgerCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
