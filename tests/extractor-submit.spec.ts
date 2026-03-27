import { expect, test } from '@playwright/test';
import { GreenhouseExtractor } from '../playwright/extractors/greenhouseExtractor.js';
import { WorkdayExtractor } from '../playwright/extractors/workdayExtractor.js';

test('greenhouse extractor detects submit controls in application footer', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <form id="application_form">
          <label for="first_name">First name</label>
          <input id="first_name" name="first_name" />
          <div class="application-footer">
            <button type="button">Submit Application</button>
          </div>
        </form>
      </body>
    </html>
  `);

  const result = await new GreenhouseExtractor().extract(page);
  expect(result.formReady).toBeTruthy();
  expect(result.submitVisible).toBeTruthy();
  expect(result.submitEnabled).toBeTruthy();
});

test('workday extractor detects next and submit controls by data-automation-id', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <form data-automation-id="jobApplication">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" />
          <button data-automation-id="pageFooterNextButton" type="button">Next</button>
        </form>
      </body>
    </html>
  `);

  const result = await new WorkdayExtractor().extract(page);
  expect(result.formReady).toBeTruthy();
  expect(result.submitVisible).toBeTruthy();
  expect(result.submitEnabled).toBeTruthy();
});
