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

test('greenhouse extractor follows embedded greenhouse iframe forms', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <div id="grnhse_app">
          <iframe id="gh_iframe"></iframe>
        </div>
      </body>
    </html>
  `);

  await page.$eval('#gh_iframe', (iframe) => {
    iframe.setAttribute('srcdoc', `
      <html>
        <body>
          <form id="application_form">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" />
            <div class="application-footer">
              <button type="submit">Submit Application</button>
            </div>
          </form>
        </body>
      </html>
    `);
  });

  await page.waitForTimeout(100);

  const result = await new GreenhouseExtractor().extract(page);
  expect(result.formReady).toBeTruthy();
  expect(result.submitVisible).toBeTruthy();
  expect(result.submitEnabled).toBeTruthy();
});

test('greenhouse extractor captures react-select combobox options', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <form id="application_form">
          <label id="question_62505311-label" for="question_62505311">Please select your time zone*</label>
          <div>
            <input
              id="question_62505311"
              role="combobox"
              type="text"
              aria-labelledby="question_62505311-label"
              aria-expanded="false"
            />
          </div>
          <script>
            const input = document.getElementById('question_62505311');
            const ensureListbox = () => {
              if (document.getElementById('react-select-question_62505311-listbox')) return;
              const listbox = document.createElement('div');
              listbox.id = 'react-select-question_62505311-listbox';
              listbox.setAttribute('role', 'listbox');
              ['GMT-5 :Eastern Standard Time (EST)', 'GMT-8 :Pacific Standard Time (PST)'].forEach((text, index) => {
                const option = document.createElement('div');
                option.id = 'react-select-question_62505311-option-' + index;
                option.setAttribute('role', 'option');
                option.textContent = text;
                listbox.appendChild(option);
              });
              document.body.appendChild(listbox);
              input.setAttribute('aria-controls', listbox.id);
              input.setAttribute('aria-expanded', 'true');
            };
            input.addEventListener('click', ensureListbox);
            input.addEventListener('keydown', (event) => {
              if (event.key === 'ArrowDown') ensureListbox();
              if (event.key === 'Escape') {
                document.getElementById('react-select-question_62505311-listbox')?.remove();
                input.setAttribute('aria-expanded', 'false');
                input.removeAttribute('aria-controls');
              }
            });
          </script>
        </form>
      </body>
    </html>
  `);

  const result = await new GreenhouseExtractor().extract(page);
  const timezone = result.fields.find((field) => field.field_id === 'question_62505311');
  expect(timezone?.type).toBe('combobox');
  expect(timezone?.options).toEqual([
    'GMT-5 :Eastern Standard Time (EST)',
    'GMT-8 :Pacific Standard Time (PST)'
  ]);
  expect(timezone?.options_deferred).toBeFalsy();
});

test('greenhouse extractor groups checkbox fieldsets into one multi-choice field', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <form id="application_form">
          <fieldset class="checkbox" id="question_64012464[]">
            <legend class="label checkbox__description">
              Have you previously worked for D2L in any capacity?
              Please select all that apply <span class="required">*</span>
            </legend>
            <div class="checkbox__wrapper">
              <input type="checkbox" id="question_64012464[]_1" name="question_64012464[]" value="1" />
              <label for="question_64012464[]_1">No, I have not worked for D2L in any capacity</label>
            </div>
            <div class="checkbox__wrapper">
              <input type="checkbox" id="question_64012464[]_2" name="question_64012464[]" value="2" checked />
              <label for="question_64012464[]_2">Yes, I was a full-time employee</label>
            </div>
            <div class="checkbox__wrapper">
              <input type="checkbox" id="question_64012464[]_3" name="question_64012464[]" value="3" />
              <label for="question_64012464[]_3">Yes, I was a co-op or intern</label>
            </div>
          </fieldset>
        </form>
      </body>
    </html>
  `);

  const result = await new GreenhouseExtractor().extract(page);
  const grouped = result.fields.find((field) => field.group_type === 'multi_choice');
  expect(grouped).toBeTruthy();
  expect(grouped?.type).toBe('checkbox');
  expect(grouped?.options).toEqual([
    'No, I have not worked for D2L in any capacity',
    'Yes, I was a full-time employee',
    'Yes, I was a co-op or intern'
  ]);
  expect(grouped?.current_value).toEqual(['Yes, I was a full-time employee']);
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
