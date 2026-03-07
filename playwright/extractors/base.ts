import type { Page } from 'playwright';
import type { AtsType, ExtractedField } from '../schemas/types.js';

export interface ExtractorResult {
  fields: ExtractedField[];
  currentStep: string | null;
  formReady: boolean;
  submitVisible: boolean;
  submitEnabled: boolean;
  warnings: string[];
}

export interface FormExtractor {
  supports(ats: AtsType): boolean;
  extract(page: Page): Promise<ExtractorResult>;
}
