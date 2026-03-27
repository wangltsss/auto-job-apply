import type { Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';

export async function detectAts(page: Page, url: string): Promise<AtsType> {
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes('greenhouse.io') ||
    lowerUrl.includes('boards.greenhouse.io') ||
    lowerUrl.includes('job-boards.greenhouse.io')
  ) {
    return 'greenhouse';
  }
  if (
    lowerUrl.includes('myworkdayjobs.com') ||
    lowerUrl.includes('workday.com') ||
    lowerUrl.includes('/workday/') ||
    lowerUrl.includes('/wday/')
  ) {
    return 'workday';
  }

  const html = (await page.content()).toLowerCase();
  if (
    html.includes('app.greenhouse.io/embed/job_board/js') ||
    html.includes('grnhse_app') ||
    html.includes('grnhse.iframe.load(') ||
    (html.includes('greenhouse') && html.includes('application'))
  ) {
    return 'greenhouse';
  }
  if (html.includes('workday') && (html.includes('candidate') || html.includes('application'))) {
    return 'workday';
  }

  return 'unknown';
}
