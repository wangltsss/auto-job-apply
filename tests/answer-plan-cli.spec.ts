import { expect, test } from '@playwright/test';
import { parseAnswerPlanCliArgs } from '../tools/answerPlanCliArgs.js';

test('parseAnswerPlanCliArgs parses required and optional flags', () => {
  const args = parseAnswerPlanCliArgs([
    '--form-artifact',
    './artifacts/forms/a.json',
    '--profile',
    './profile.json',
    '--mock-response',
    './response.json'
  ]);

  expect(args.formArtifactPath).toBe('./artifacts/forms/a.json');
  expect(args.profilePath).toBe('./profile.json');
  expect(args.mockResponsePath).toBe('./response.json');
});

test('parseAnswerPlanCliArgs requires form artifact', () => {
  expect(() => parseAnswerPlanCliArgs([])).toThrow('Missing required --form-artifact');
});

test('parseAnswerPlanCliArgs rejects unknown flags', () => {
  expect(() => parseAnswerPlanCliArgs(['--form-artifact', './artifacts/forms/a.json', '--bogus'])).toThrow('Unknown flag: --bogus');
});
