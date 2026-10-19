# E7 — Post-MVP collaboration capabilities

**Priority:** P2
**Depends on:** Validated v1
**Goal:** Expand only with independent product and platform decisions.

## Tasks

- [ ] **E7.1 Direct messages and group DMs.** Decide generic conversation model,
  group limit, membership change/leave policy, blocking/reporting, and notification
  semantics.
- [ ] **E7.2 Search and retrieval.** Design authorized indexing, filters, result
  context, deletion/retention behavior, and relevance validation.
- [ ] **E7.3 Notifications and presence.** Define attention policy, mute, mentions,
  browser push, online/away/DND, and graceful delivery failure.
- [ ] **E7.4 Saved items and resources.** Define personal-only saves, pins, and
  channel resources without making shared taxonomy user-specific.
- [ ] **E7.5 Integrations/bots/workflows.** Define consent, scopes, bot identity,
  rate limits, audit, and marketplace/governance boundaries.
- [ ] **E7.6 Huddles/canvas/tasks.** Make separate build/partner/defer decisions;
  do not implicitly become a video or document suite.
- [ ] **E7.7 External/enterprise collaboration.** Address guests, shared channels,
  SSO/SCIM, export, retention, and legal/compliance as separate programs.

## Acceptance criteria

- Each capability has a standalone value case, permission model, threat model,
  cost/reliability analysis, and explicit MVP exclusion until approved.
