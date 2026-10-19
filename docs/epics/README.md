# Epics and tasks

These are design-phase issues, deliberately expressed as build-ready problem
statements rather than implementation work already under way. A task is ready
when its dependencies are resolved and acceptance criteria are demonstrably met.

| ID | Epic | Priority | Dependencies |
| --- | --- | --- | --- |
| [E0](EPIC-00-foundation.md) | Product, tenancy, and decision foundation | P0 | None |
| [E1](EPIC-01-workspaces.md) | Workspace membership and invitations | P0 | E0 |
| [E2](EPIC-02-channels.md) | Channels and access control | P0 | E0, E1 |
| [E3](EPIC-03-conversations.md) | Messages, threads, and reactions | P0 | E1, E2 |
| [E4](EPIC-04-realtime.md) | Safe best-effort realtime | P0 | E2, E3 |
| [E5](EPIC-05-trust-quality.md) | Trust, accessibility, and release quality | P1 | E1–E4 |
| [E6](EPIC-06-validation.md) | Validation and release readiness | P1 | E0–E5 |
| [E7](EPIC-07-expansion.md) | Post-MVP collaboration capabilities | P2 | Validated v1 |
| [E8](EPIC-08-attachments.md) | Authorized shared attachments (blocked) | Blocked | PAS capability |

Priority: P0 validates the core product; P1 makes it trustworthy and releaseable;
P2 is deliberately deferred. No item is authorization to provision PAS resources.
