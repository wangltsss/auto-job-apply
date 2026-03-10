import { readFile } from 'node:fs/promises';
import { runAnswerPlan } from '../orchestration/runAnswerPlan.js';

interface Args {
  formArtifactPath: string;
  profilePath?: string;
  mockResponsePath?: string;
}

function parseArgs(argv: string[]): Args {
  let formArtifactPath = '';
  let profilePath: string | undefined;
  let mockResponsePath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === '--form-artifact') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --form-artifact');
      formArtifactPath = value;
      continue;
    }
    if (token === '--profile') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --profile');
      profilePath = value;
      continue;
    }
    if (token === '--mock-response') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --mock-response');
      mockResponsePath = value;
      continue;
    }

    throw new Error(`Unknown flag: ${token}`);
  }

  if (!formArtifactPath) {
    throw new Error('Missing required --form-artifact');
  }

  return { formArtifactPath, profilePath, mockResponsePath };
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const profile = args.profilePath ? (JSON.parse(await readFile(args.profilePath, 'utf-8')) as Record<string, unknown>) : {};

    const output = await runAnswerPlan({
      extractedFormArtifactPath: args.formArtifactPath,
      applicantProfile: profile,
      mockOpenClawRawOutputPath: args.mockResponsePath
    });

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        stage: output.stage,
        answer_plan_artifact_path: output.answerPlanArtifactPath,
        answer_plan_status: output.answerPlanStatus
      })}\n`
    );
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}

main();
