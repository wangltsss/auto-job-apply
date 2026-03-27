import type { AtsType } from '../schemas/types.js';
import type { FormExtractor } from './base.js';
import { GenericFormExtractor } from './genericExtractor.js';
import { GreenhouseExtractor } from './greenhouseExtractor.js';
import { WorkdayExtractor } from './workdayExtractor.js';

const extractors: FormExtractor[] = [
  new GreenhouseExtractor(),
  new WorkdayExtractor(),
  new GenericFormExtractor()
];

export function chooseExtractor(ats: AtsType): FormExtractor {
  return extractors.find((extractor) => extractor.supports(ats)) ?? new GenericFormExtractor();
}
