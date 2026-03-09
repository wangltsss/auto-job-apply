import { readFile } from 'node:fs/promises';
import type { ExtractedField, ExtractedFormSuccess } from '../playwright/schemas/types.js';
import { isExtractedFormResult } from '../playwright/schemas/validators.js';
import { ReasoningBridgeError } from './errors.js';
import type { ApplicantProfile, ReasoningBridgeBuildInput, ReasoningFieldInput, ReasoningInput } from './types.js';

export const DEFAULT_POLICY_FLAGS = {
  skip_demographic_questions_by_default: true,
  do_not_guess_ambiguous_questions: true,
  submit_only_if_safe: true
} as const;

export async function readExtractedFormArtifact(artifactPath: string): Promise<ExtractedFormSuccess> {
  let raw: string;
  try {
    raw = await readFile(artifactPath, 'utf-8');
  } catch (error) {
    throw new ReasoningBridgeError('missing_extracted_form_artifact', 'Extracted form artifact not found', {
      artifactPath,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ReasoningBridgeError('invalid_extracted_form_artifact', 'Extracted form artifact is not valid JSON', {
      artifactPath,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isExtractedFormResult(parsed)) {
    throw new ReasoningBridgeError('invalid_extracted_form_artifact', 'Extracted form artifact failed schema validation', {
      artifactPath
    });
  }

  if (parsed.status !== 'success') {
    throw new ReasoningBridgeError('invalid_extracted_form_artifact', 'Extracted form artifact is not a successful extraction payload', {
      artifactPath,
      scrapeStatus: parsed.status
    });
  }

  return parsed;
}

export function buildReasoningInput(input: ReasoningBridgeBuildInput): ReasoningInput {
  const fields = input.extractedForm.fields.map(toReasoningField);

  return {
    ats: input.extractedForm.ats,
    application_url: input.extractedForm.url,
    page_title: input.extractedForm.page_title,
    current_step: input.extractedForm.current_step,
    fields,
    applicant_profile: sanitizeApplicantProfile(input.applicantProfile),
    policy_flags: input.policyFlags
  };
}

function toReasoningField(field: ExtractedField): ReasoningFieldInput {
  return {
    field_id: field.field_id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options,
    options_deferred: field.options_deferred,
    semantic_category: field.semantic_category,
    sensitivity: field.sensitivity,
    auto_answer_safe: field.auto_answer_safe,
    file_kind: field.file_kind,
    help_text: field.help_text,
    section: field.section
  };
}

function sanitizeApplicantProfile(profile: ApplicantProfile): ApplicantProfile {
  return JSON.parse(JSON.stringify(profile)) as ApplicantProfile;
}
