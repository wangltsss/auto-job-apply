# Autonomous Clawdbot System Design

## Status
Draft specification.

## Purpose
This document defines the architecture, control model, data contracts, and operational behavior of this repository as an autonomous job application system and OpenClaw skill package.

The system combines:
- deterministic browser automation for application scraping and submission
- agent-assisted questionnaire reasoning through Clawdbot
- MCP-based external tool integration
- persistent job-pool and application-ledger state
- structured reporting for successful, failed, and uncertain outcomes

This document is written as a product and integration specification for external readers and implementers.

## Scope
The system is responsible for:
- ingesting job postings from manual and automated sources
- normalizing and deduplicating postings into a job pool
- selecting postings from the eligible job pool for processing
- scraping application forms
- generating and validating questionnaire answers
- executing job applications deterministically
- retrying recoverable failures
- logging exact provenance for successful and failed attempts
- exposing stable MCP-compatible operations for external orchestration
- stopping when a requested number of successful applications has been reached or no eligible jobs remain

The system is not responsible for:
- general-purpose browsing outside the job-application domain
- unbounded support for every job site or anti-bot flow
- delegating low-level DOM execution decisions to Clawdbot

## Design Principles
- Deterministic execution: page interaction, selector resolution, and submission behavior are owned by the repository runtime and do not depend on free-form agent behavior during execution.
- Structured reasoning: Clawdbot may infer answers to underspecified questions, but all reasoning outputs must be converted into validated structured plan artifacts before execution.
- MCP interoperability: external orchestration is exposed through stable, tool-shaped operations that can be mapped directly into an MCP server surface.
- Durable state: job-pool state, attempts, and final application records must be stored durably and independently from ephemeral runtime memory.
- Provenance: every submitted answer must be traceable to an explicit source category.
- Bounded autonomy: the system operates autonomously within explicit policy, confidence, and support boundaries.
- Controlled failure: recoverable failures must retry according to policy; unsupported or terminal conditions must be classified and recorded without looping indefinitely.

## System Overview
The system consists of five primary components:
- job pool
- MCP integration surface
- Clawdbot orchestration interface
- deterministic runtime
- application ledger
- run controller and retry manager

The primary control loop is success-targeted rather than queue-targeted. A run continues until one of the following conditions is met:
- the requested number of successful applications has been reached
- the pool contains no additional eligible postings
- execution is halted by a fatal system condition or policy stop

## Component Model

### Job Pool
The job pool is the durable source of truth for candidate job postings.

The job pool is responsible for:
- accepting new job postings from ingestion channels
- storing original source references
- normalizing postings to canonical application records
- deduplicating postings against existing pool entries and prior applications
- tracking lifecycle state
- exposing jobs for processing

The job pool contains postings that have already passed eligibility determination.
Eligibility is an ingestion responsibility:
- for manual ingestion, the human submitter determines eligibility before adding a posting to the pool
- for automated ingestion, the ingester determines eligibility before adding a posting to the pool

The runtime therefore treats the pool as pre-filtered for eligibility.

The job pool state model is:
- `discovered`
- `normalized`
- `queued`
- `attempting`
- `applied`
- `failed_retryable`
- `failed_terminal`
- `skipped`

### Clawdbot Orchestration Interface
Clawdbot is the orchestration and reasoning participant.

Clawdbot is responsible for:
- initiating a run with a target success count
- supplying policy and profile context
- inferring answers for questions that cannot be resolved directly from structured facts
- receiving structured per-job and per-run results
- presenting the final user-facing report

Clawdbot is not responsible for:
- page interaction
- selector selection
- runtime recovery tactics
- direct manipulation of form controls

### MCP Integration Surface
The MCP integration surface is the standard external interface for tool-based orchestration.

The MCP integration surface is responsible for:
- exposing repository capabilities as stable tool operations
- preserving structured input and output contracts
- mapping external tool calls to internal deterministic runtime modules
- separating transport/protocol concerns from application logic

The MCP surface does not replace the internal runtime. It is the protocol boundary through which Clawdbot and other MCP clients interact with the repository.

### Deterministic Runtime
The deterministic runtime is the execution core of the repository.

The runtime is responsible for:
- loading one normalized job posting
- scraping the current application form
- assembling reasoning input from known facts, documents, job context, and Clawdbot inference
- validating answer plans against runtime contracts
- executing form interactions deterministically
- verifying execution state
- writing artifacts
- classifying outcomes

The runtime processes one job attempt at a time as the baseline execution model. Controlled parallelism may be added only if job claiming, session isolation, and artifact durability remain correct.

### Application Ledger
The application ledger is the durable record of attempts and final outcomes.

The ledger is responsible for:
- recording every application attempt
- recording every successful application
- recording every terminal or exhausted failure
- preserving answer provenance
- preserving artifact references
- supporting audit, reconciliation, and reporting

Artifacts are retained as execution evidence. The ledger is the operational system of record.

### Run Controller and Retry Manager
The run controller owns progress through the job pool.

The run controller is responsible for:
- claiming eligible jobs one at a time
- invoking the deterministic runtime
- incrementing run success count only on successful application completion
- scheduling strategic retries for retryable failures
- terminating the run on success target completion or pool exhaustion
- preventing duplicate concurrent attempts on the same posting

## Processing Model

### Run Lifecycle
1. A run is created with a target success count and optional policy context.
2. The run controller selects one job from the pool.
3. An application attempt record is created.
4. The deterministic runtime processes the job.
5. If the attempt succeeds, the run success count is incremented.
6. If the attempt fails with a retryable classification, a subsequent attempt is scheduled according to retry policy.
7. If the attempt fails with a terminal or exhausted classification, the job is marked accordingly and the run continues to the next posting in the pool.
8. The run ends when the target success count has been reached or the pool contains no additional postings.
9. The final report includes run totals, per-job outcomes, and unresolved uncertain-answer items.

### Single Job Lifecycle
1. Resolve canonical application URL and verify that the posting remains processable.
2. Select profile and document versions for the attempt.
3. Scrape the live application form.
4. Resolve answers directly from known facts where possible.
5. Request Clawdbot inference for questions that require deduction.
6. Mark low-confidence answers as uncertain when they do not meet submission policy.
7. Build and validate the answer plan.
8. Execute the plan deterministically.
9. Verify field and submission state.
10. Persist attempt, artifacts, and classification.
11. Update job state and ledger entries.

## Answering Model
The system does not assume that all possible questionnaire answers are pre-authored.

Each answer must be derived from one of the following provenance classes:
- `explicit_profile`
- `resume_fact`
- `historical_answer`
- `clawdbot_inferred`
- `user_confirmation_required`

Answer resolution follows this order:
1. explicit structured profile facts
2. deterministic document-derived or historical facts
3. Clawdbot inference from known applicant information and job context
4. uncertainty handling when confidence remains below policy threshold

The system must not submit an answer classified as `user_confirmation_required` unless policy explicitly permits autonomous submission for that question class.

The final report must include unresolved uncertain answers with:
- job identity
- question text
- provisional answer, if any
- provenance
- confidence rationale
- resulting application status

## Responsibility Boundary
The system boundary between Clawdbot and the repository runtime is strict.

Clawdbot owns:
- run initiation
- target success count
- policy context
- inference for underspecified questionnaire fields
- final reporting

The MCP integration surface owns:
- tool discovery and invocation boundaries
- structured transport of repository operations
- machine-readable request and response envelopes

The repository runtime owns:
- job claiming and progression
- browser automation
- form extraction
- answer-plan validation
- deterministic field execution
- tactical retries
- failure classification
- artifact writing
- ledger persistence

This boundary is required to prevent low-level runtime behavior from devolving into unstable agent-driven browser control.

### Operational Contract
For a run to execute successfully, Clawdbot and the repository runtime must each satisfy a defined set of obligations.

#### Clawdbot Obligations
Clawdbot must:
- initiate the run through the MCP integration surface
- provide the target success count for the run
- ensure that eligible postings have already been inserted into the job pool
- provide policy context required by the reasoning stage
- provide access to known applicant information, including profile facts and document-backed facts
- infer answers for underspecified questionnaire fields when deterministic known facts are insufficient
- consume the structured run result and final report outputs
- surface unresolved clarification items to the user when the runtime records `user_clarification_required` answers

Clawdbot must not:
- control browser actions directly
- select low-level interaction strategies such as locators, click order, or widget handling
- apply its own independent strategic retry loop for a failed application attempt that the runtime has already classified

#### Repository Runtime Obligations
The repository runtime must:
- claim one job at a time from the job pool
- execute the deterministic single-job pipeline for the claimed posting
- extract the live form and produce the extracted-form artifact
- validate answer-plan output before execution
- stop before execution when the answer-plan status is not `proceed`
- execute validated answers deterministically in the browser
- persist artifacts, job-pool state transitions, ledger entries, and run records
- classify failures according to the runtime retry policy
- schedule bounded strategic retries when a failure is classified as retryable
- stop the run when the target success count is reached or the pool is exhausted

The repository runtime must not:
- invent applicant facts that are not present in known data or Clawdbot inference output
- bypass answer-plan validation
- continue executing a quarantined or not-eligible answer plan
- allow more than one active run to process the same workspace stores concurrently

#### Preconditions For Run Execution
A run may begin only when all of the following are true:
- the job pool contains at least one eligible posting in a claimable state
- browser execution prerequisites are available, including any required session state for the target site
- applicant profile and document context required for reasoning are available to Clawdbot
- the MCP integration surface can invoke repository operations and receive machine-readable results

If any of these conditions are not met, the system must fail explicitly rather than attempting a degraded autonomous run.

#### End-To-End Execution Sequence
The end-to-end contract between Clawdbot and the repository runtime is:
1. Clawdbot initiates a run and supplies the target success count and policy context.
2. The runtime creates the run record and claims one job from the pool.
3. The runtime extracts the application form and prepares reasoning input.
4. Clawdbot provides answer inference for fields not resolved directly from known facts.
5. The runtime validates the answer plan and either stops on non-`proceed` status or executes it deterministically.
6. The runtime persists artifacts, ledger data, and job state.
7. The runtime either schedules a strategic retry or moves to the next claimable posting.
8. The runtime terminates on success-target completion or pool exhaustion.
9. Clawdbot consumes the final run result and presents unresolved clarification items to the user.

## Data Contracts

### Job Posting Record
A job posting record must contain:
- `job_id`
- `source_type`
- `source_url`
- `canonical_job_url`
- `apply_url`
- `company`
- `title`
- `location`
- `employment_type`
- `posted_at`
- `discovered_at`
- `status`
- `dedupe_key`
- `notes`
- `raw_payload`

### Application Attempt Record
An application attempt record must contain:
- `attempt_id`
- `job_id`
- `run_id`
- `attempt_number`
- `started_at`
- `ended_at`
- `profile_version_id`
- `resume_version_id`
- `cover_letter_version_id`
- `storage_state_ref`
- `stage_reached`
- `outcome`
- `retryable`
- `failure_category`
- `failure_code`
- `failure_details`
- `answer_provenance`
- `uncertain_answers`
- `scrape_artifact_path`
- `answer_plan_artifact_path`
- `execution_artifact_path`
- `pipeline_artifact_path`

### Application Success Record
A successful application record must contain:
- `application_id`
- `job_id`
- `attempt_id`
- `run_id`
- `applied_at`
- `company`
- `title`
- `apply_url`
- `final_url`
- `ats`
- `profile_version_id`
- `resume_version_id`
- `cover_letter_version_id`
- `submitted_answers_summary`
- `submitted_answers_provenance`
- `artifacts`

Application success records are immutable except for append-only metadata enrichment that does not alter the original application facts.

### Failure Record
A failure record must contain:
- `failure_id`
- `job_id`
- `attempt_id`
- `detected_at`
- `failure_category`
- `failure_code`
- `retryable`
- `site_signature`
- `ats`
- `message`
- `details`

### Profile and Document Version Records
The system must version:
- applicant profile data
- resumes
- cover letters
- known facts derived from prior user input or normalized documents

Every application attempt must reference the exact versions used.

## Failure Classification
Every failed attempt must be classified into one primary category:
- `transient_ui`
- `network`
- `session`
- `data`
- `reasoning`
- `uncertainty`
- `site_change`
- `policy`
- `duplicate`
- `unsupported`
- `terminal`

Classification semantics are:
- `transient_ui`: recoverable browser or widget instability
- `network`: transport or remote availability failure
- `session`: invalid authentication or session state
- `data`: missing or contradictory required applicant data
- `reasoning`: invalid or unusable structured reasoning output
- `uncertainty`: answer confidence below submission threshold
- `site_change`: extractor or resolver mismatch due to page drift
- `policy`: system policy forbids continuation
- `duplicate`: application already exists or has already been submitted
- `unsupported`: workflow requires unsupported capabilities such as captcha or manual assessment
- `terminal`: non-retryable failure not covered by another category

## Retry Model
The system uses two retry layers.

### Tactical Retries
Tactical retries occur inside scraping and execution stages and cover short-lived runtime instability such as:
- stale elements
- modal timing races
- transient widget readiness failures
- recoverable navigation timing issues

Tactical retries are local, bounded, and do not create new application attempts.

### Strategic Retries
Strategic retries occur at the run-controller layer and create a new application attempt record.

Strategic retries apply only to failures classified as retryable. Strategic retry behavior is governed by policy and must include:
- maximum attempt count
- retry delay or backoff
- optional site-specific cool-down behavior

The system must not allow independent strategic retry scheduling by both Clawdbot and the runtime for the same failed attempt.

### Initial Strategic Retry Policy
The initial strategic retry policy for the current runtime failure codes is:

| Failure code | Stage | Primary category | Retryable |
| --- | --- | --- | --- |
| `scrape_failed` | `scrape` | `site_change` or `network` | `true` |
| `missing_extracted_form_artifact` | `answer_plan` | `data` | `false` |
| `invalid_extracted_form_artifact` | `answer_plan` | `data` | `false` |
| `openclaw_invocation_failure` | `answer_plan` | `reasoning` | `true` |
| `malformed_openclaw_json` | `answer_plan` | `reasoning` | `true` |
| `answer_plan_schema_validation_failed` | `answer_plan` | `reasoning` | `true` |
| `answer_plan_status_quarantine` | `answer_plan` | `policy` | `false` |
| `answer_plan_status_not_eligible` | `answer_plan` | `policy` | `false` |
| `field_not_found` | `execute` | `site_change` | `false` |
| `locator_resolution_failed` | `execute` | `transient_ui` | `true` |
| `unsupported_field_type` | `execute` | `unsupported` | `false` |
| `verification_failed` | `execute` | `transient_ui` | `true` |
| `upload_failed` | `execute` | `transient_ui` | `true` |
| `navigation_failed` | `execute` | `network` | `true` |
| `session_state_invalid` | `execute` | `session` | `false` |
| `live_field_not_found` | `execute` | `site_change` | `false` |
| `live_verification_failed` | `execute` | `transient_ui` | `true` |
| `upload_widget_bind_failed` | `execute` | `transient_ui` | `true` |
| `submit_blocked_by_policy` | `execute` | `policy` | `false` |
| `submit_failed` | `execute` | `network` or `site_change` | `true` |

The initial controller policy is:
- each full pipeline run against a claimed job consumes one strategic attempt
- scrape, answer-plan, and execute failures each count as a strategic attempt
- the maximum strategic attempt count per job is `3`
- the second attempt is eligible immediately
- the third attempt is delayed by `5` minutes
- after the maximum attempt count is exhausted, the job is marked `failed_terminal`
- `attempting` jobs are not claimable by another active run

## Logging and Audit

### Successful Applications
For every successful application, the system must record:
- job identity
- company, title, and location
- canonical and final URLs
- ATS classification
- submission timestamp
- profile and document versions used
- normalized submitted-answer summary
- submitted-answer provenance
- artifact references

### Failed Applications
For every failed application attempt, the system must record:
- attempt number
- stage reached
- failure category
- failure code
- retryability
- artifact references
- diagnostic explanation

### Uncertain Outcomes
For every unresolved uncertain-answer case, the system must record:
- job identity
- question text
- provisional answer, if any
- answer provenance
- confidence rationale
- whether the application was skipped, paused, failed, or otherwise withheld from submission

## Incident Handling
The system must detect repeated systemic failures and aggregate them into site-level or ATS-level incidents.

An incident may be opened when repeated failures share a common signature, including:
- repeated field-resolution failures on the same ATS
- repeated extraction failures on the same employer flow
- repeated session failures for the same authenticated surface

When an incident is active, the system may pause or deprioritize affected jobs in order to avoid repeated wasteful failures.

## Ingestion Model
The system supports both manual and automated job sources.

Manual sources include:
- user-selected postings
- mobile share flows
- direct submission of posting URLs

Automated sources may include future discovery pipelines.

All sources must pass through the same normalization and deduplication pipeline before becoming job-pool entries.

Eligibility is determined before insertion into the pool:
- manual ingestion assumes the human submitter has already determined that the posting is eligible
- automated ingestion must apply its own eligibility policy before inserting the posting into the pool

As a result, all postings present in the pool are treated as eligible by definition.
Runtime processing may still fail later due to unsupported workflow, session state, missing data, or confidence thresholds, but these are execution outcomes rather than eligibility decisions.

## Session and Authentication
Authenticated application surfaces require explicit session-state management.

The system must:
- detect invalid or expired storage state
- classify authentication failures distinctly from generic runtime failures
- avoid infinite retries on blocked authentication surfaces
- preserve the relationship between session state and attempt outcome

Unsupported authentication gates, including captcha or mandatory manual verification, must be classified as `unsupported` unless the runtime explicitly supports them.

## External Interface Contract
The package and OpenClaw skill expose structured operations through an MCP-compatible tool surface rather than free-form browser commands.

### Enqueue Jobs
Input:
- one or more job-posting URLs
- optional source metadata
- optional notes

Output:
- normalized job identifiers
- deduplication results
- resulting job states

### Start Run
Input:
- target success count
- optional profile selector
- optional source filters

Output:
- `run_id`
- target success count
- initial run state

### Query Run
Input:
- `run_id`

Output:
- achieved success count
- remaining pool jobs
- per-job outcomes
- unresolved uncertain-answer items
- final state when complete

### Query Job
Input:
- `job_id`

Output:
- job state
- last attempt result
- success or failure record, if finalized

## MCP Mapping
The external interface is defined so that each operation can be represented directly as an MCP tool.

The MCP layer must preserve:
- structured input validation
- machine-readable success and failure envelopes
- stable operation names
- deterministic delegation into repository modules

The MCP layer does not permit free-form browser control. Browser execution remains owned by the deterministic runtime.

## Run Result Contract
A completed run result must contain:
- `run_id`
- `target_success_count`
- `achieved_success_count`
- `processed_job_count`
- `successful_job_count`
- `failed_job_count`
- `skipped_job_count`
- `pool_exhausted`
- `per_job_results`
- `uncertain_answer_items`
- `started_at`
- `ended_at`
- `status`

Each per-job result must contain:
- `job_id`
- `attempt_id`
- `run_id`
- `outcome`
- `retryable`
- `failure_category`
- `failure_code`
- `application_id`
- `profile_version_id`
- `resume_version_id`
- `uncertain_answers`
- `artifacts`
- `summary`

## Operational Requirements
- Dry-run mode must remain available.
- Submission mode must be explicit.
- Job processing must be idempotent with respect to duplicates and replayed commands.
- A posting must be claimed before processing to prevent duplicate concurrent attempts.
- Artifact and ledger writes must be durable before a result is acknowledged as complete.
- Run completion must be based on successful applications, not attempted postings.

## Acceptance Criteria
This design is satisfied when:
- the package exposes structured job-ingestion, run-control, and status-query interfaces through an MCP-compatible tool surface
- Clawdbot participates in answer inference without owning DOM execution
- the runtime executes applications deterministically through validated plans
- job-pool state and application-ledger state are durable and auditable
- answer provenance is recorded for submitted and uncertain answers
- retry behavior is bounded and classified
- unsupported and terminal conditions are explicit
- final reporting includes successful applications, failed attempts, and unresolved uncertain-answer items

## Conclusion
This repository is defined as a bounded-autonomy job application system and OpenClaw skill package.

Clawdbot provides orchestration and reasoning assistance. The MCP integration surface provides protocol-standard tool access. The repository runtime provides deterministic browser execution, durable state handling, retry control, and auditability. Together, these components support autonomous application runs that terminate on success-count completion, pool exhaustion, or explicit policy boundaries.
