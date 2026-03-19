import { expect, test } from '@playwright/test';
import { parseScrapeCliArgs } from '../tools/scrapeCliArgs.js';

test('parseScrapeCliArgs parses flags and defaults', () => {
  const args = parseScrapeCliArgs(['--url', 'https://jobs.example.test/apply/123', '--storage-state', './state.json', '--headed', '--no-trace', '--timeout-ms', '45000']);

  expect(args.url).toBe('https://jobs.example.test/apply/123');
  expect(args.storageStatePath).toBe('./state.json');
  expect(args.headless).toBeFalsy();
  expect(args.traceEnabled).toBeFalsy();
  expect(args.timeoutMs).toBe(45000);
});

test('parseScrapeCliArgs requires url', () => {
  expect(() => parseScrapeCliArgs([])).toThrow('Missing required --url');
});

test('parseScrapeCliArgs rejects invalid timeout and unknown flags', () => {
  expect(() => parseScrapeCliArgs(['--url', 'https://jobs.example.test/apply/123', '--timeout-ms', '0'])).toThrow(
    'Invalid value for --timeout-ms'
  );
  expect(() => parseScrapeCliArgs(['--url', 'https://jobs.example.test/apply/123', '--bogus'])).toThrow('Unknown flag: --bogus');
});
