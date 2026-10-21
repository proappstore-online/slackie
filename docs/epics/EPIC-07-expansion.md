# E7 — Post-MVP collaboration capabilities

**Priority:** P2
**Depends on:** E6 validated v1; each owning epic's dependencies
**Goal:** Route post-MVP proposals to their owning epics only after independent
product and platform decisions; this umbrella does not duplicate those specs or
block their separately sequenced design work.

## Tasks

- [x] **E7.1 Route direct messages and group DMs to E11.** E11 owns the generic
  conversation model, group limit, membership changes, blocking/reporting, and
  notification semantics.
- [x] **E7.2 Route search and retrieval to E12.** E12 owns authorized indexing,
  filters, result context, deletion/retention behavior, and relevance validation.
- [x] **E7.3 Route notifications, presence, and personal triage to E11.** E11
  owns attention policy, mute, mentions, push, presence/typing deferral, saved
  items, and delivery failure behavior.
- [x] **E7.4 Route integrations, bots, and workflows to E15.** E15 owns consent,
  scopes, bot identity, rate limits, audit, and marketplace boundaries.
- [x] **E7.5 Route canvases, huddles, and tasks to E16.** E16 owns the separate
  build/partner/defer decision and must not turn Slackie implicitly into a video
  or document suite.
- [x] **E7.6 Route guests to E9 and external/enterprise collaboration to E17.**
  E9 owns the guest policy; E17 owns shared channels, SSO/SCIM, retention, and
  legal/compliance as enterprise programs.

## Acceptance criteria

- Each proposal is routed to one owning epic with a standalone value case,
  permission model, threat model, cost/reliability analysis, and explicit MVP
  exclusion until approved.

## Review material

The [post-MVP routing proposal](../design/post-mvp-collaboration.md) records each
proposal's owning epic, value case, permission/threat boundaries, cost/reliability
analysis, staged entry gates, routing dispositions and acceptance test plan.
The routing package is complete: each capability is deferred to its owning epic
and excluded from MVP pending separate approval. Completion of E7 does not close
the owning epics or approve feature delivery or PAS provisioning.

## Decision gates

E7 closes the inventory/routing decision by assigning one owner per proposal and
recording a defer disposition with the required assessments. Product/platform
approval, E6 validated-v1 evidence, each owning epic's dependencies, build-ready
child-issue creation and release validation remain future gates owned by those
epics, as detailed in the routing package. No feature implementation is approved
by checking this routing checklist.
