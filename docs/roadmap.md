# Delivery roadmap

## Design-first release gates

| Phase | Outcome | Exit evidence |
| --- | --- | --- |
| 0 — Foundation | Product boundary and PAS architecture agreed | Brief, IA, permissions, ADRs, risks, and explicit capability gaps approved. |
| 1 — Core workspace | Invitation-based workspace and channel model ready to build | Complete user flows, action schema, data model, and authorization test matrix. |
| 2 — Trustworthy conversation | Messaging, threads, reactions, best-effort realtime, and moderation designed | Accessibility states, recovery rules, threat controls, and E2E plan complete. |
| 3 — Validate v1 | Design tested with target teams | Prototype feedback, revised decisions, metrics plan, release checklist. |
| 4 — Expansion | DMs, search, notifications, files, integrations considered separately | Each has a capability decision and scoped epic. |

## Decision gates before code

1. Multi-workspace tenancy — **Resolved**: see [ADR-005](adr/ADR-005-multi-workspace-tenancy.md).
2. Confirm one primary owner, optional owner/admin/member matrix, and
   private-review policy. Guest access is unavailable until its scoped lifecycle
   and discovery rules are designed.
3. Confirm product differentiation; do not ship a branded Slack facsimile.
4. Validate current PAS action, room, storage, and worker capabilities.
5. Resolve attachment delivery before making file sharing a release promise.
6. Select the generic conversation abstraction before the first additive schema
   migration; channel-only messages make later DM design unsafe.
7. Validate durable change-feed sync and the 32-peer room capacity envelope.
8. Establish message retention/deletion and moderation-response policy.
9. Run usability sessions on creation, channel discovery, compose/thread, and
   access-denied recovery flows.

## Principal risks

| Risk | Response |
| --- | --- |
| Rooms mistaken for a durable feed | Keep actions/D1 canonical and refetch-driven. |
| Realtime room capacity silently drops users | Publish a limit and explicit polling/degraded path, or validate alternative transport. |
| Private visibility only enforced in UI | Treat authorization predicates and negative tests as release gates. |
| Storage gap makes file sharing unsafe | Block attachment build scope until platform support exists. |
| Over-scoping to Slack parity | Protect MVP non-goals and separate post-MVP epics. |
| User attention fatigue | Validate unread/mute/mention rules before push notifications. |
