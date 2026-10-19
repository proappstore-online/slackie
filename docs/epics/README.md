# Epics and tasks

These are design-phase issues, deliberately expressed as build-ready problem
statements rather than implementation work already under way. A task is ready
when its dependencies are resolved and acceptance criteria are demonstrably met.

Tenancy gate E0.2 is resolved: multi-workspace tenancy is adopted
([ADR-005](../adr/ADR-005-multi-workspace-tenancy.md)); other E0 decisions remain open.

| ID | Epic | Priority | Dependencies |
| --- | --- | --- | --- |
| [E0](EPIC-00-foundation.md) | Product, tenancy, and decision foundation | P0 | None |
| [E1](EPIC-01-workspaces.md) | Workspace membership and invitations | P0 | E0; E9 before production delivery |
| [E2](EPIC-02-channels.md) | Channels and access control | P0 | E0, E1 |
| [E3](EPIC-03-conversations.md) | Messages, threads, and reactions | P0 | E1, E2 |
| [E4](EPIC-04-realtime.md) | Safe best-effort realtime | P0 | E2, E3 |
| [E5](EPIC-05-trust-quality.md) | Trust, accessibility, and release quality | P1 | E1–E4 |
| [E6](EPIC-06-validation.md) | Validation and release readiness | P1 | E0–E5 |
| [E7](EPIC-07-expansion.md) | Post-MVP collaboration capabilities | P2 | E6 validated v1; each owning epic's dependencies |
| [E8](EPIC-08-attachments.md) | Authorized shared attachments | Blocked on PAS platform capability | Verified member-scoped shared-read primitive (E8.1) |
| [E9](EPIC-09-identity-governance.md) | Identity, ownership, guest policy, and governance | P0 design, P1 delivery | E0, E1 |
| [E10](EPIC-10-durable-sync-and-scale.md) | Durable sync, scale, online-only recovery | P0 | E3, E4 |
| [E11](EPIC-11-attention-and-dms.md) | Attention model, threads, and future direct messages | P0 attention design, P1 DM delivery | E3, E10 |
| [E12](EPIC-12-search-and-retrieval.md) | Authorized search and retrieval | P1 | E2, E3, E9, E10 |
| [E13](EPIC-13-trust-moderation-and-admin.md) | Trust, moderation, administration, and privacy operations | P1 | E5, E9 |
| [E14](EPIC-14-experience-accessibility-mobile.md) | Experience system, accessibility, mobile, and localization | P1 | E0–E5 |
| [E15](EPIC-15-integrations-and-workflows.md) | Integrations, bots, and workflows | P2 | E9, E10, E13 |
| [E16](EPIC-16-canvases-and-huddles.md) | Canvases, durable knowledge, and huddles | P2 | E12–E15 |
| [E17](EPIC-17-enterprise-and-ai.md) | Organization scale, enterprise controls, and AI | P3 | Mature E9–E16, except blocked E8; attachment-dependent claims also need E8 |
| [E18](EPIC-18-portability-and-launch.md) | Portability, analytics, and launch operations | P2 | E9, E12, E13 |

Priority: P0 validates the core product; P1 makes it trustworthy and releaseable;
P2 is deliberately deferred, P3 depends on mature operations. No item is
authorization to provision PAS resources.
