export type LedgerCommand = 'list-attempts' | 'list-successes' | 'list-failures' | 'list-clarifications';

export interface LedgerCliArgs {
  command: LedgerCommand;
  storePath?: string;
}

export const LEDGER_CLI_USAGE = `Usage:
  npm run tool:ledger -- list-attempts [--store-path <path>]
  npm run tool:ledger -- list-successes [--store-path <path>]
  npm run tool:ledger -- list-failures [--store-path <path>]
  npm run tool:ledger -- list-clarifications [--store-path <path>]`;

export function parseLedgerCliArgs(argv: string[]): LedgerCliArgs {
  const command = argv[0] as LedgerCommand | undefined;
  if (!command || !['list-attempts', 'list-successes', 'list-failures', 'list-clarifications'].includes(command)) {
    throw new Error('Missing or invalid ledger command');
  }

  let storePath: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--store-path') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --store-path');
      storePath = value;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  return { command, storePath };
}
