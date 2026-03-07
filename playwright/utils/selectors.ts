export const STEP_HINT_SELECTORS: string[] = [
  '[aria-current="step"]',
  '[data-test*="progress"]',
  '.application-progress',
  '.jobs-easy-apply-content__step',
  '.progress-bar'
];

export const HELP_TEXT_SELECTORS: string[] = [
  '.help-text',
  '.description',
  '.form-note',
  '.artdeco-inline-feedback__message',
  '[id*="help"]'
];

export const VALIDATION_SELECTORS: string[] = [
  '.error',
  '.errors',
  '.invalid-feedback',
  '[aria-live="assertive"]',
  '.artdeco-inline-feedback--error'
];

export const BLOCKED_TEXT_PATTERNS: RegExp[] = [
  /sign in/i,
  /log in/i,
  /captcha/i,
  /verify (you|your identity)/i,
  /access denied/i,
  /session expired/i
];

export const PRIMARY_FORM_SELECTORS: string[] = [
  'form',
  '[role="form"]',
  '.jobs-easy-apply-content',
  '#application_form'
];
