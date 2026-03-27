import { expect, test } from '@playwright/test';
import { detectAts } from '../playwright/ats/detectAts.js';

test('detectAts identifies greenhouse and workday and treats unsupported job boards as unknown', async ({ page }) => {
  await page.setContent('<html><body><form></form></body></html>');
  await expect(detectAts(page, 'https://job-boards.greenhouse.io/example/jobs/123')).resolves.toBe('greenhouse');
  await expect(detectAts(page, 'https://company.wd5.myworkdayjobs.com/en-US/careers/job/123')).resolves.toBe('workday');
  await expect(detectAts(page, 'https://www.linkedin.com/jobs/view/123')).resolves.toBe('unknown');
});

test('detectAts identifies greenhouse from custom-hosted embed fingerprints', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <div id="grnhse_app"></div>
        <script src="https://app.greenhouse.io/embed/job_board/js?for=d2l"></script>
        <script>Grnhse.Iframe.load(7507702);</script>
      </body>
    </html>
  `);

  await expect(
    detectAts(page, 'https://www.d2l.com/careers/jobs/software-test-developer-future-consideration/7507702/?gh_src=LinkedIn')
  ).resolves.toBe('greenhouse');
});
