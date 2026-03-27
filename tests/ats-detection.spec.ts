import { expect, test } from '@playwright/test';
import { detectAts } from '../playwright/ats/detectAts.js';

test('detectAts identifies greenhouse and workday and treats unsupported job boards as unknown', async ({ page }) => {
  await page.setContent('<html><body><form></form></body></html>');
  await expect(detectAts(page, 'https://job-boards.greenhouse.io/example/jobs/123')).resolves.toBe('greenhouse');
  await expect(detectAts(page, 'https://company.wd5.myworkdayjobs.com/en-US/careers/job/123')).resolves.toBe('workday');
  await expect(detectAts(page, 'https://www.linkedin.com/jobs/view/123')).resolves.toBe('unknown');
});
