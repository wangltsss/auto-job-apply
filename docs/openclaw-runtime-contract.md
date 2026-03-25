# OpenClaw and Runtime Contract

This document defines the operational responsibility boundary between OpenClaw and this repository.

OpenClaw is the orchestrator and decision-making layer.
This repository is the deterministic runtime and durable state layer.

## Purpose
The contract exists to prevent two failure modes:
- OpenClaw attempting to perform low-level browser control that belongs in the runtime
- the runtime making eligibility or anti-bot decisions that belong in OpenClaw

## OpenClaw Duties
OpenClaw is responsible for deciding whether a job application attempt should proceed.

OpenClaw duties include:
- initiating a run
- defining the target success count
- providing policy context and user-specific facts
- maintaining knowledge about the applicant, including profile facts, resume facts, LinkedIn facts, GitHub facts, and prior clarifications
- inferring answers for underspecified questionnaire fields
- determining whether a posting remains eligible for the applicant
- identifying employer-side constraints that make the posting ineligible or inappropriate to continue
- identifying anti-bot or unsupported workflows and deciding whether they can be bypassed safely
- deciding when to stop attempting a posting before the runtime performs a submission attempt
- consuming the final run result and presenting unresolved clarification items to the user

### Eligibility Decisions Owned by OpenClaw
OpenClaw owns all applicant-specific or posting-specific eligibility judgments, including:
- citizenship, permanent-resident, visa, sponsorship, or work-authorization requirements
- location or relocation requirements that contradict known applicant facts
- duplicate-role restrictions such as “apply to one role only”
- posting rules that require the applicant to choose among multiple related roles
- any other posting-level condition that makes the applicant ineligible even if the posting entered the pool

If OpenClaw concludes that a posting is not eligible, OpenClaw must stop the attempt and mark the posting accordingly rather than asking the runtime to continue.

### Anti-Bot and Unsupported Workflow Decisions Owned by OpenClaw
OpenClaw owns the decision boundary for anti-bot and unsupported workflow handling.

OpenClaw must:
- recognize when a site presents anti-bot friction such as captcha, hard challenge pages, or other deliberate automation barriers
- determine whether the current environment and tool surface support continued operation
- stop the attempt when the barrier cannot be handled safely or reliably

This repository may detect execution failure conditions, but it does not decide that anti-bot barriers should be bypassed.

## Repository Runtime Duties
The repository runtime is responsible for executing an already-approved attempt deterministically.

Runtime duties include:
- storing and managing the job pool
- claiming one job at a time for a run
- extracting the live application form
- preparing reasoning input
- validating answer-plan output
- refusing to execute answer plans that are quarantined or not eligible
- filling and verifying fields deterministically
- handling bounded tactical retries during scrape and execution
- applying bounded strategic retries at the run-controller layer according to runtime policy
- writing artifacts, ledger entries, run records, and job-state transitions
- stopping when the run reaches the target success count or the pool is exhausted

### Runtime Exclusions
The runtime does not:
- determine applicant eligibility from posting requirements
- decide whether citizenship, PR, sponsorship, or related requirements disqualify the applicant
- decide whether multi-role employer restrictions should block continuation
- decide whether anti-bot mechanisms should be bypassed
- improvise low-level behavior outside validated deterministic execution

## Handoff Boundary
The handoff between OpenClaw and the runtime is:
1. OpenClaw decides that a posting is eligible and processable.
2. OpenClaw initiates or continues a run.
3. The runtime claims the next available posting and executes deterministic processing.
4. If the runtime encounters a runtime failure, it classifies and records it.
5. If the runtime encounters a condition that requires orchestration-level judgment, the result is returned to OpenClaw.
6. OpenClaw decides whether the posting should be skipped, clarified, retried later through the run controller, or surfaced to the user.

## Stop Conditions Owned by OpenClaw
OpenClaw must stop a posting before submission when any of the following is true:
- the posting is not eligible for the applicant
- the posting contains employer-side rules that conflict with prior applications or current run policy
- the site presents an anti-bot or unsupported workflow that cannot be handled safely
- a required answer cannot be inferred confidently and must be surfaced for user clarification

## Stop Conditions Owned by the Runtime
The runtime must stop the current attempt when any of the following is true:
- answer-plan validation fails
- answer-plan status is `quarantine` or `not_eligible`
- deterministic execution fails and the failure is terminal
- the current run reaches its target success count
- the pool contains no further claimable postings

## Summary
OpenClaw decides whether the system should apply.
This repository performs the application attempt deterministically once that decision has been made.
