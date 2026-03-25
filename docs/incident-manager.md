# Incident Manager

The incident manager is the operational hardening layer for repeated systemic failures.

## Purpose
The incident manager exists to:
- aggregate repeated failures across runs
- open site-level incidents when repeated failures share a common signature
- apply cooldown behavior to prevent repeated wasteful attempts
- treat session failures as explicit operational incidents
- support unattended reporting through incident queries

## Incident Signature
The current incident signature model is site-level.

Each incident is keyed by:
- host
- failure category
- failure code

The resulting `site_signature` format is:
- `<host>|<failure_category>|<failure_code>`

This repository currently opens site-scoped incidents.

## Trigger Rules
The current default incident policy is:
- repeated failure threshold: `3`
- repeated failure window: `30` minutes
- repeated failure cooldown: `30` minutes
- session failure cooldown: `30` minutes

Session failures are treated specially:
- a single `session` failure opens an incident immediately
- affected hosts are cooled down without waiting for additional repeated failures

## Operational Behavior
When an incident is active:
- jobs on the affected host are excluded from new claims
- the run controller continues on unaffected hosts when available
- if all remaining claimable work is blocked by cooldown, the controller waits until the next resume window

This prevents retry storms while preserving progress on unaffected postings.

## Reporting Surface
Incident records are durable and queryable.

The package-facing incident query returns:
- incident count
- active or resolved incidents
- host
- failure category
- failure code
- cooldown window
- trigger count

This supports unattended reporting and post-run operational inspection.
