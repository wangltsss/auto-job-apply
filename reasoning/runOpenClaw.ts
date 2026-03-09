import { spawn } from 'node:child_process';
import { ReasoningBridgeError } from './errors.js';
import type { OpenClawRunResult, OpenClawRunnerOptions } from './types.js';

export async function runOpenClaw(prompt: string, options: OpenClawRunnerOptions = {}): Promise<OpenClawRunResult> {
  const command = options.command ?? 'openclaw';
  const args = options.args ?? ['run', '--stdin'];
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

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
