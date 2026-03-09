import { resolve } from 'node:path';
import { runReasoningBridgeSafe } from '../reasoning/index.js';

async function main(): Promise<void> {
  const extractedFormPath = process.argv[2] ?? resolve('examples/fixtures/extracted-form.sample.json');
  const mockOpenClawOutputPath = process.argv[3] ?? resolve('examples/fixtures/valid-openclaw-response.json');

  const result = await runReasoningBridgeSafe({
    extractedFormArtifactPath: extractedFormPath,
    mockOpenClawRawOutputPath: mockOpenClawOutputPath,
    applicantProfile: {
      basics: {
        first_name: 'Taylor',
        last_name: 'Chen',
        email: 'taylor.chen@example.com',
        phone: '+1-555-0100',
        location: 'Montreal, QC, Canada'
      },
      links: {
        linkedin: 'https://www.linkedin.com/in/taylorchen'
      },
      files: {
        resume_path: '/home/shawn/Documents/auto-apply/assets/resume-tailored.pdf',
        cover_letter_path: '/home/shawn/Documents/auto-apply/assets/cover-letter-tailored.pdf'
      }
    }
  });

  if (result.status === 'error') {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        status: result.status,
        answerPlanPath: result.answerPlanPath,
        answerPlanStatus: result.answerPlan.status
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
