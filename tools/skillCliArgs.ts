import type { SkillOperationName } from '../skill-adapter/index.js';

export type SkillCommand = 'describe' | 'call';

export interface DescribeSkillCliArgs {
  command: 'describe';
}

export interface CallSkillCliArgs {
  command: 'call';
  operation: SkillOperationName;
  inputFilePath?: string;
  inputJson?: string;
}

export type SkillCliArgs = DescribeSkillCliArgs | CallSkillCliArgs;

export const SKILL_CLI_USAGE = `Usage:
  npm run tool:skill -- describe
  npm run tool:skill -- call --operation describe_operations
  npm run tool:skill -- call --operation <name> [--input-file <path> | --input-json <json>]`;

function parseCommand(token: string | undefined): SkillCommand {
  if (token === 'describe' || token === 'call') {
    return token;
  }

  throw new Error('Missing or invalid skill command, expected describe|call');
}

function parseOperation(token: string | undefined): SkillOperationName {
  if (
    token === 'describe_operations' ||
    token === 'enqueue_posting' ||
    token === 'query_job' ||
    token === 'start_run' ||
    token === 'query_run' ||
    token === 'query_ledger' ||
    token === 'query_incidents'
  ) {
    return token;
  }

  throw new Error('Missing or invalid --operation value');
}

export function parseSkillCliArgs(argv: string[]): SkillCliArgs {
  const command = parseCommand(argv[0]);

  if (command === 'describe') {
    return { command };
  }

  let operation: SkillOperationName | undefined;
  let inputFilePath: string | undefined;
  let inputJson: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--operation') {
      operation = parseOperation(argv[++i]);
      continue;
    }

    if (token === '--input-file') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --input-file');
      inputFilePath = value;
      continue;
    }

    if (token === '--input-json') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --input-json');
      inputJson = value;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  if (!operation) {
    throw new Error('Missing required --operation');
  }

  if (inputFilePath && inputJson) {
    throw new Error('Use only one of --input-file or --input-json');
  }

  return {
    command,
    operation,
    inputFilePath,
    inputJson
  };
}
