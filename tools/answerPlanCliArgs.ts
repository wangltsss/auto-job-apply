export interface AnswerPlanCliArgs {
  formArtifactPath: string;
  profilePath?: string;
  mockResponsePath?: string;
}

export const ANSWER_PLAN_CLI_USAGE = `Usage: npm run tool:answer-plan -- --form-artifact <path> [--profile <path>] [--mock-response <path>]`;

export function parseAnswerPlanCliArgs(argv: string[]): AnswerPlanCliArgs {
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
