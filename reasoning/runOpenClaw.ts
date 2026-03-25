import { spawn } from 'node:child_process';
import { ReasoningBridgeError } from './errors.js';
import type { OpenClawRunResult, OpenClawRunnerOptions } from './types.js';

export interface OpenClawInvocation {
  command: string;
  args: string[];
  stdinPrompt: boolean;
}

function resolveDefaultRouting(options: OpenClawRunnerOptions): string[] {
  const agent =
    options.agent ??
    process.env.OPENCLAW_AGENT_ID ??
    process.env.OPENCLAW_AGENT ??
    process.env.OPENCLAW_RUNTIME_AGENT;
  if (agent) {
    return ['--agent', agent];
  }

  const sessionId = options.sessionId ?? process.env.OPENCLAW_SESSION_ID;
  if (sessionId) {
    return ['--session-id', sessionId];
  }

  const to = options.to ?? process.env.OPENCLAW_TO;
  if (to) {
    return ['--to', to];
  }

  throw new ReasoningBridgeError(
    'openclaw_invocation_failure',
    'OpenClaw routing is missing. Set OPENCLAW_AGENT_ID to a dedicated agent such as autoapply or pass openClaw.agent.',
    {
      command: options.command ?? 'openclaw',
      args: options.args ?? ['agent', '--local', '--message', '<prompt>'],
      failure_category: 'data',
      failure_reason: 'openclaw_routing_missing',
      routing_sources_checked: [
        'options.agent',
        'OPENCLAW_AGENT_ID',
        'OPENCLAW_AGENT',
        'OPENCLAW_RUNTIME_AGENT',
        'options.sessionId',
        'OPENCLAW_SESSION_ID',
        'options.to',
        'OPENCLAW_TO'
      ]
    }
  );
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

  const routingArgs = resolveDefaultRouting(options);

  return {
    command,
    args: ['agent', '--local', ...routingArgs, '--message', prompt],
    stdinPrompt: false
  };
}

export function buildOpenClawFailureDetails(
  command: string,
  args: string[],
  exitCode: number,
  stderr: string,
  stdout: string
): Record<string, unknown> {
  const details: Record<string, unknown> = {
    command,
    args,
    exitCode,
    stderr,
    stdout
  };

  if (stderr.includes('session file locked') || stderr.includes('.jsonl.lock')) {
    details.lock_contention = true;
    details.failure_category = 'session';
    details.failure_reason = 'openclaw_session_locked';
  }

  return details;
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
          new ReasoningBridgeError(
            'openclaw_invocation_failure',
            'OpenClaw returned non-zero exit code',
            buildOpenClawFailureDetails(command, args, exitCode, stderr, stdout)
          )
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
