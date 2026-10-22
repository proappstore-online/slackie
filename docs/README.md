# Slackie design documentation

This directory is the source of truth for the design phase. Each document is
written to answer a future build team's questions without silently making product
or operational commitments.

| Document | Purpose |
| --- | --- |
| [product-brief.md](product-brief.md) | Audience, problem, MVP scope, principles, and success measures. |
| [visual-system.md](visual-system.md) | Component inventory, visual decisions, contrast measurements and review gate. |
| [design/inclusive-experience.md](design/inclusive-experience.md) | E14 proposed keyboard, announcement, recovery and localization contracts with acceptance matrix and outstanding review gates. |
| [localization.md](localization.md) | E14.5 string inventory, locale/zone precedence, RTL/content-language contract, validation plan and review gate. |
| [announcements-and-recovery.md](announcements-and-recovery.md) | E14.4/E14.6 event policy, recovery matrix, validation scenarios and design review gate. |
| [keyboard-and-assistive-technology.md](keyboard-and-assistive-technology.md) | E14.3 keyboard contract, shortcut decisions, P0 reader/zoom matrix and approval gate. |
| [experience-design.md](experience-design.md) | Navigation, user journeys, states, accessibility, and interaction guidance. |
| [system-architecture.md](system-architecture.md) | Proposed PAS components, boundaries, reliability, and deployment shape. |
| [data-model.md](data-model.md) | Tenant-scoped entities, relationships, indexes, integrity, and retention. |
| [realtime-and-api.md](realtime-and-api.md) | API/resource conventions, room events, ordering, sync, and failure handling. |
| [design/trust-moderation-and-privacy.md](design/trust-moderation-and-privacy.md) | E13 case, enforcement, audit, administration, subject-request and incident design with review gates. |
| [design/portability-analytics-and-launch.md](design/portability-analytics-and-launch.md) | E18 export/import, privacy-safe analytics, beta/GA evidence gates and acceptance scenarios. |
| [security-and-trust.md](security-and-trust.md) | Roles, authorization, privacy, abuse controls, and auditability. |
| [roadmap.md](roadmap.md) | Phases, release gates, risks, and decisions to validate. |
| [research-foundations.md](research-foundations.md) | Primary-source research and platform constraints that shaped the plan. |
| [design/post-mvp-collaboration.md](design/post-mvp-collaboration.md) | E7 proposal routing, review gates and future acceptance tests. |
| [design/enterprise-and-ai.md](design/enterprise-and-ai.md) | E17 organization, external collaboration, enterprise lifecycle and AI design gates and acceptance tests. |
| [design/integrations-and-workflows.md](design/integrations-and-workflows.md) | E15 installation, OAuth, bot/webhook, interaction and workflow design gates and acceptance tests. |
| [epics/](epics/) | Build-ready epics with sequenced tasks and acceptance criteria. |
| [adr/](adr/) | Architecture decision records as choices are made. |

## Design boundary

The documents specify a buildable direction, not a promise to replicate every
Slack feature. Slackie must remain an independently branded product and must not
copy Slack trade dress, proprietary content, or integrations.
