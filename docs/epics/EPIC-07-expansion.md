# E7 — Post-MVP collaboration capabilities

**Priority:** P2
**Depends on:** E6 validated v1; each owning epic's dependencies
**Goal:** Route post-MVP proposals to their owning epics only after independent
product and platform decisions; this umbrella does not duplicate those specs or
block their separately sequenced design work.

## Tasks

- [ ] **E7.1 Route direct messages and group DMs to E11.** E11 owns the generic
  conversation model, group limit, membership changes, blocking/reporting, and
  notification semantics.
- [ ] **E7.2 Route search and retrieval to E12.** E12 owns authorized indexing,
  filters, result context, deletion/retention behavior, and relevance validation.
- [ ] **E7.3 Route notifications, presence, and personal triage to E11.** E11
  owns attention policy, mute, mentions, push, presence/typing deferral, saved
  items, and delivery failure behavior.
- [ ] **E7.4 Route integrations, bots, and workflows to E15.** E15 owns consent,
  scopes, bot identity, rate limits, audit, and marketplace boundaries.
- [ ] **E7.5 Route canvases, huddles, and tasks to E16.** E16 owns the separate
  build/partner/defer decision and must not turn Slackie implicitly into a video
  or document suite.
- [ ] **E7.6 Route guests to E9 and external/enterprise collaboration to E17.**
  E9 owns the guest policy; E17 owns shared channels, SSO/SCIM, retention, and
  legal/compliance as enterprise programs.

## Acceptance criteria

- Each proposal is routed to one owning epic with a standalone value case,
  permission model, threat model, cost/reliability analysis, and explicit MVP
  exclusion until approved.
