export type AtsType = 'greenhouse' | 'linkedin_easy_apply' | 'unknown';

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'combobox'
  | 'file'
  | 'unknown';

export type ScrapeStatus = 'success' | 'blocked' | 'error';
export type SemanticCategory =
  | 'personal_identity'
  | 'contact_info'
  | 'profile_link'
  | 'work_authorization'
  | 'employment_history'
  | 'compensation'
  | 'attachment'
  | 'demographic'
  | 'unknown';

export type Sensitivity = 'none' | 'demographic' | 'legal' | 'compensation';
export type FileKind = 'resume' | 'cover_letter' | 'other' | 'unknown';
export type GroupType = 'none' | 'single_choice' | 'multi_choice';

export interface ExtractedField {
  field_id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder: string | null;
  help_text: string | null;
  section: string | null;
  current_value: string | boolean | string[] | null;
  selector_hint: string | null;
  visible: boolean;
  enabled: boolean;
  validation_text: string | null;
  semantic_category: SemanticCategory;
  group_id: string | null;
  group_label: string | null;
  group_type: GroupType;
  options_deferred: boolean;
  file_kind: FileKind;
  sensitivity: Sensitivity;
  auto_answer_safe: boolean;
  internal: boolean;
  source_tag: string | null;
  name_attr: string | null;
  id_attr: string | null;
  aria_label: string | null;
}

export interface ExtractedFormSuccess {
  status: 'success';
  url: string;
  ats: AtsType;
  page_title: string;
  current_step: string | null;
  form_ready: boolean;
  submit_visible: boolean;
  submit_enabled: boolean;
  fields: ExtractedField[];
  warnings: string[];
  extracted_at: string;
}

export interface ExtractedFormFailure {
  status: 'blocked' | 'error';
  reason: string;
  current_url: string;
  ats_guess: AtsType;
  screenshot_path: string | null;
  trace_path: string | null;
  extracted_at: string;
}

export type ExtractedFormResult = ExtractedFormSuccess | ExtractedFormFailure;

export interface ScrapeOptions {
  url: string;
  headless?: boolean;
  timeoutMs?: number;
  storageStatePath?: string;
  traceEnabled?: boolean;
}
