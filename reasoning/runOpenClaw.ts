import { spawn } from 'node:child_process';
import { ReasoningBridgeError } from './errors.js';
import type { OpenClawRunResult, OpenClawRunnerOptions } from './types.js';

export interface OpenClawInvocation {
  command: string;
  args: string[];
  stdinPrompt: boolean;
}

export function buildOpenClawInvocation(prompt: string, options: OpenClawRunnerOptions = {}): OpenClawInvocation {
  const command = options.command ?? 'openclaw';

  if (options.args) {
    return {
      command,
      args: options.args.map((arg) => (arg === '{prompt}' ? prompt : arg)),
      stdinPrompt: options.stdinPrompt ?? options.args.includes('--stdin')
    };
  }

  return {
    command,
    args: ['agent', '--local', '--plain', '--message', prompt],
    stdinPrompt: false
  };
}

export async function runOpenClaw(prompt: string, options: OpenClawRunnerOptions = {}): Promise<OpenClawRunResult> {
  const invocation = buildOpenClawInvocation(prompt, options);
  const { command, args, stdinPrompt } = invocation;
  const timeoutMs = options.timeoutMs ?? 60_000;

  return new Promise<OpenClawRunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(
        new ReasoningBridgeError('openclaw_invocation_failure', 'OpenClaw invocation timed out', {
          command,
          args,
          timeoutMs
        })
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new ReasoningBridgeError('openclaw_invocation_failure', 'Failed to start OpenClaw process', {
          command,
          args,
          error: error.message
        })
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      if (exitCode !== 0) {
        reject(
          new ReasoningBridgeError('openclaw_invocation_failure', 'OpenClaw returned non-zero exit code', {
            command,
            args,
            exitCode,
            stderr,
            stdout
          })
        );
        return;
      }

      resolve({ stdout, stderr, exitCode });
    });

    if (stdinPrompt) {
      child.stdin.write(prompt);
    }
    child.stdin.end();
  });
}
