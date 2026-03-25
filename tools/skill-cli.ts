import { readFile } from 'node:fs/promises';
import { dispatchSkillOperation } from '../skill-adapter/index.js';
import { buildFailureEnvelope, buildSuccessEnvelope, hasHelpFlag, isDirectExecution, writeJsonLine } from './cliShared.js';
import { parseSkillCliArgs, SKILL_CLI_USAGE } from './skillCliArgs.js';

function parseJsonObject(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Skill input must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}

export async function runSkillCli(
  argv: string[],
  stdout: NodeJS.WriteStream = process.stdout,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  if (hasHelpFlag(argv) || argv.length === 0) {
    stdout.write(`${SKILL_CLI_USAGE}\n`);
    return 0;
  }

  try {
    const args = parseSkillCliArgs(argv);

    if (args.command === 'describe') {
      const result = await dispatchSkillOperation('describe_operations', {});
      writeJsonLine(
        buildSuccessEnvelope(
          'skill',
          {},
          {
            command: 'describe',
            operations: result.operations
          }
        ),
        stdout
      );
      return 0;
    }

    let input: Record<string, unknown> = {};
    if (args.inputFilePath) {
      input = parseJsonObject(await readFile(args.inputFilePath, 'utf-8'));
    } else if (args.inputJson) {
      input = parseJsonObject(args.inputJson);
    }

    const result = await dispatchSkillOperation(args.operation, input as never);
    writeJsonLine(
      buildSuccessEnvelope(
        'skill',
        {},
        {
          command: 'call',
          operation: args.operation,
          output: result
        }
      ),
      stdout
    );
    return 0;
  } catch (error) {
    writeJsonLine(buildFailureEnvelope(error, 'skill'), stderr);
    return 1;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runSkillCli(process.argv.slice(2));
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main();
}
