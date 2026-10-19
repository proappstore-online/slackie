# E18 — Portability, analytics, and launch operations

**Priority:** P2
**Depends on:** E9, E12, E13
**Goal:** Make adoption and support deliberate rather than one-off operational work.

## Tasks

- [ ] **E18.1 Define export contract.** Authority, private/DM scope, manifest,
  versioning, checksums, pagination, expiry, download log, and redaction.
- [ ] **E18.2 Design Slack import discovery.** Manifest validation, author/channel
  mapping, provenance, timestamps, threads/reactions, collision policy, and no
  implicit impersonation.
- [ ] **E18.3 Make import resumable.** Dry run, quotas, batches, idempotency,
  checkpoints, error report, explicit final commit, cancel, and attachment gap.
- [ ] **E18.4 Define privacy-safe analytics.** Event taxonomy excluding bodies and
  queries, activation/retention dashboards, controls, and review process.
- [ ] **E18.5 Plan beta and launch.** Feature flags, workspace allow-list, feedback
  taxonomy, support, incident drill, backup restore test, policy copy, and docs.

## Acceptance criteria

- A retry cannot duplicate imported messages or reactions.
- Imported records preserve provenance and never masquerade as a live member.
- Import/export logs diagnose failure without revealing source content.
