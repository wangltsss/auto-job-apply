import type { Page } from 'playwright';
import type { AtsType } from '../schemas/types.js';

export async function detectAts(page: Page, url: string): Promise<AtsType> {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('greenhouse.io')) {
    return 'greenhouse';
  }
  if (lowerUrl.includes('linkedin.com/jobs')) {
    return 'linkedin_easy_apply';
  }

  const html = (await page.content()).toLowerCase();
  if (html.includes('greenhouse') && html.includes('application')) {
    return 'greenhouse';
  }
  if (html.includes('easy apply') && html.includes('linkedin')) {
    return 'linkedin_easy_apply';
  }

  return 'unknown';
}
