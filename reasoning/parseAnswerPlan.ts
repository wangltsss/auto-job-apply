import type { AnswerPlan } from '../playwright/schemas/answerPlanTypes.js';
import { isAnswerPlan } from '../playwright/schemas/answerPlanValidators.js';
import { ReasoningBridgeError } from './errors.js';

export function parseAndValidateAnswerPlan(rawOutput: string): AnswerPlan {
  const jsonCandidate = extractJsonObject(rawOutput);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    throw new ReasoningBridgeError('malformed_openclaw_json', 'OpenClaw output is not valid JSON', {
      rawOutput,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isAnswerPlan(parsed)) {
    throw new ReasoningBridgeError('answer_plan_schema_validation_failed', 'OpenClaw output failed AnswerPlan schema validation', {
      parsed
    });
  }

  return parsed;
}

function extractJsonObject(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw new ReasoningBridgeError('malformed_openclaw_json', 'OpenClaw output is empty', { rawOutput });
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const fencedBody = fenced?.[1];
  const candidate = fencedBody ? fencedBody.trim() : trimmed;

  const start = candidate.indexOf('{');
  if (start === -1) {
    throw new ReasoningBridgeError('malformed_openclaw_json', 'No JSON object start token found in OpenClaw output', {
      rawOutput
    });
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, i + 1);
      }
    }
  }

  throw new ReasoningBridgeError('malformed_openclaw_json', 'JSON object in OpenClaw output is not balanced', {
    rawOutput
  });
}
