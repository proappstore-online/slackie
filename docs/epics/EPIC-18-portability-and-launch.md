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
  taxonomy, named incident-response/on-call ownership and drill, backup/restore
  test against documented RPO/RTO targets, privacy policy and terms readiness,
  policy copy, and docs. Define separate beta and GA definitions of done: beta
  requires a limited allow-list, support coverage, known-risk disclosure, and
  recovery rehearsal; GA additionally requires closed launch-blockers, sustained
  service evidence, on-call readiness, and approved public policy/support docs.

## Acceptance criteria

- A retry cannot duplicate imported messages or reactions.
- Imported records preserve provenance and never masquerade as a live member.
- Import/export logs diagnose failure without revealing source content.
- Beta and GA cannot be claimed until their respective definitions of done are
  evidenced, including incident/on-call, recovery-target, and policy gates.

## Design deliverable and review status

[Portability, analytics and launch design](../design/portability-analytics-and-launch.md)
specifies E18.1–E18.5: scoped export manifests/delivery, safe archive discovery and
historical attribution, resumable staging/publication, aggregate analytics and
separate beta/GA evidence requirements. Its acceptance matrix defines future
service tests; `qa/actions.mjs` covers existing SQL prerequisites only.

The design deliverable is complete. Task checkboxes remain open for independent
review and the G1–G5 approvals; no services, launch readiness, policy approval or
PAS provisioning are claimed. E9/E12/E13 and private-storage dependencies remain
explicit. Build-ready child issues must wait until the decision gates close.
