# E0 — Product, tenancy, and decision foundation

**Priority:** P0
**Goal:** Agree on what Slackie is before code or provisioned infrastructure.

## Tasks

- [ ] **E0.1 Define ICP, jobs, and differentiation.** State target team size,
  primary jobs, alternatives, and three reasons to choose Slackie without making
  Slack-parity claims.
- [x] **E0.2 Decide tenancy.** Resolved: multi-workspace tenancy adopted —
  see [ADR-005](../adr/ADR-005-multi-workspace-tenancy.md). Routing, onboarding,
  and support implications follow the adopted multi-workspace model.
- [ ] **E0.3 Approve roles and privacy boundary.** Ratify owner/admin/member/guest
  capabilities and whether any exceptional private-content review is permitted.
- [ ] **E0.4 Produce core journey map.** Cover create/join workspace, discover or
  join channel, send/retry, reply in thread, and access-denied recovery.
- [ ] **E0.5 Write ADRs.** Record template-workspace choice, action-authoritative
  data design, room-as-hint design, attachment capability gap, canonical ID
  scheme, UTC timestamp/time-zone rendering, and soft-delete versus hard-purge
  lifecycle policy.

## Acceptance criteria

- ✅ Resolved: multi-workspace tenancy — ADR-005 accepted.
- Scope, non-goals, metrics, and decisions in docs have a named owner.
- Every P0 surface maps to an authorized user journey and a specific entity.
- No document promises huddles, integrations, shared uploads, or enterprise
  governance in the first build.
