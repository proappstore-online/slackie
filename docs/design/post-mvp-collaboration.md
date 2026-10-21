# Post-MVP collaboration routing proposal (E7 / #11)

Status: E7 routing package complete. Disposition for every proposal: defer
feature delivery to its single owning epic; exclude from MVP until separately
approved. Completion here records scope and routing, not product/platform approval
of implementation. Owning epics and provisioning retain their separate gates.

## Ownership and proposal assessments

Each row has one accountable owning epic. Dependencies provide contracts rather
than shared ownership. The proposals are independent: approving one does not
approve adjacent features or expand the MVP.

| Proposal / E7 task | Owning epic | Standalone value case | Proposed permission boundary | Threats and required mitigations | Cost and reliability controls |
| --- | --- | --- | --- | --- | --- |
| Direct and group messages / E7.1 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.5 | Let a small team resolve a private question without creating a channel. | Current workspace and conversation membership on every read/write; canonical pair resolution; group membership changes create a successor conversation. Approve group cap, history, guest and block/report rules first. | Guessed IDs, unintended history disclosure, harassment and membership races: test SQL scope, atomic successor creation, blocking and reporting. Owners have no private-history bypass. | Measure conversation growth, notification fanout and moderation load; bound group size; verify idempotent creation and recovery through E10. |
| Search and retrieval / E7.2 | [E12](../epics/EPIC-12-search-and-retrieval.md) | Recover an authorized past decision without scrolling history. | Recheck current workspace/channel membership before hits, context or metadata; public-channel discovery grants no message access. | Index/cache leakage, stale deletion, query logging: live authorization joins, atomic index lifecycle and content-free diagnostics. | Validate PAS indexing support, storage/write amplification, bounded query latency and rebuild recovery; see the [search proposal](authorized-search.md). |
| Notifications / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.1–E11.4 | Surface actionable mentions and replies without forcing constant timeline scanning. | Personal Activity and preferences; current source access at delivery/open; push requires separate opt-in. Read cursors and Activity clearing remain independent. | Lock-screen disclosure, duplicate alerts, post-removal delivery: privacy-safe previews, authorization at dispatch, deduplication and revocation-aware queues. | Budget fanout, queue retries and delivery-provider cost; approve DND/time-zone policy, fallback and failure visibility. No delivery guarantee from rooms. |
| Presence and typing / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.7 | Reduce uncertainty about an ongoing exchange, if research justifies the privacy cost. | Explicit consent and visibility rules, including guests and blocked users; ephemeral state grants no history access. | Activity surveillance and stale online claims: define expiry, consent withdrawal, background behavior and abuse controls before enabling. | Remain deferred; measure battery/traffic and viewer fanout. PAS rooms are body-free no-replay hints capped at 32 peers, 100 messages/second and 4 KB; degraded behavior must be explicit. |
| Personal triage / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.6 | Let a member return to work later without changing anyone else's read state. | Saved/reminder state belongs only to its user; source links reauthorize on every open. | Cross-user saved-item reads and retained excerpts after revocation: owner-scoped SQL, minimal source references and unavailable-source behavior. | Bound per-user storage and reminder jobs; approve retry/deduplication and deletion behavior independently from notifications. |
| Integrations, bots and workflows / E7.4 | [E15](../epics/EPIC-15-integrations-and-workflows.md) | Automate a repetitive handoff with attributable, revocable actions. | Explicit installation and actor grants intersect current channel access; consent/scopes and bot identity cannot exceed the grant. | Forged/replayed events, credential theft, confused deputies and runaway jobs: signatures/expiry, encrypted credentials, rotation, rate limits and audit. | Price webhook/job volume, concurrency, retries and dead letters; prove disable/uninstall stops authority. Marketplace remains separately deferred. |
| Canvases and durable knowledge / E7.5 | [E16](../epics/EPIC-16-canvases-and-huddles.md), E16.1–E16.2 | Preserve a maintained decision or checklist beside a conversation. | Approve inheritance versus explicit grants, version/history access, export and search policies. Shared binary assets depend on E8. | Document/history leakage, unsafe rich text and lost edits: scoped reads, safe rendering and explicit conflict behavior. | Decide build/partner/defer separately from huddles; estimate version storage, indexing and autosave load. PAS supplies no app-owned offline conflict engine. |
| Huddles and synchronous media / E7.5 | [E16](../epics/EPIC-16-canvases-and-huddles.md), E16.3–E16.5 | Resolve a time-sensitive conversation through an optional live session. | Session invitation never grants channel history; approve join/moderation rules. Recording, captions, transcription and AI summaries each need separate consent and retention decisions. | Unauthorized joins, screen/voice disclosure and covert capture: authenticated sessions, device preflight, visible consent and enforceable lifecycle. | Separate build/partner/defer decision; measure SFU/TURN costs, regions, browser support and fallback. PAS rooms cannot serve as media/signalling without independently verified transport suitability. |
| Tasks / E7.5 | [E16](../epics/EPIC-16-canvases-and-huddles.md), E16.1–E16.2 boundary decision | Track an agreed follow-up with an assignee and completion state beside its source conversation. | Proposed initial boundary is conversation-scoped checklist blocks in canvases; assignment requires current membership and never grants source access. Standalone task management requires a new E16 scope decision. | Assignment spam, cross-conversation links and history leakage: authorize every task read/change and assignee lookup, rate-limit assignment, audit transitions and reauthorize source links. | Defer alongside canvases; bound task/version storage and assignment notifications. Decide due dates, reminders, concurrent changes and deletion semantics before delivery; no implicit project-management suite. |
| Guests / E7.6 | [E9](../epics/EPIC-09-identity-governance.md), E9.5 | Collaborate with a time-limited participant in explicitly allowed channels. | Sponsor, allow-list and expiry; no default public discovery. Decide DM, search, mentions and conversion rules before exposure. | Accidental full membership and residual access: deny unsupported guest identities and revoke actions, feed, rooms, search and notifications atomically. | Estimate expiry/revocation jobs and sponsor support; test lifecycle races and historical attribution before rollout. |
| External and enterprise collaboration / E7.6 | [E17](../epics/EPIC-17-enterprise-and-ai.md), E17.1–E17.3 | Support cross-organization work and managed identity when customer demand warrants the operational program. | Approve cross-org identity, sponsor/consent, policy inheritance and disconnect; organization roles never bypass current conversation membership. | Cross-tenant leaks, SCIM/SSO privilege drift and conflicting retention/legal holds: explicit authority mapping, audit partition and tested disconnect/deprovisioning. | Estimate identity-provider, compliance, residency, restore and support costs; require operational evidence before security claims. Attachment-dependent promises additionally require E8. |

## Staged entry and decision record

1. **Design intake:** owner confirms the value case and scope above, identifies a
   target cohort and measurable outcome, and records alternatives including defer.
   Owning epics may continue independently sequenced design before E6 completes.
2. **Product and platform review:** record permission/threat review, dependency
   contracts, numeric capacity/cost budgets, fallback and support owner. Unknown
   platform capabilities block the affected proposal; they are not promises.
3. **Build readiness:** E6 validated-v1 evidence and the owning epic's dependencies
   must be linked, with all relevant decisions closed. Only then split build-ready
   child issues with schema/action/UI work and executable acceptance tests.
4. **Release:** run authorization, lifecycle, accessibility, recovery and load
   checks against the implementation; approve a bounded rollout with rollback and
   content-free success/error metrics. Provisioning requires separate explicit
   approval even when a design or child issue is approved.

## Routing disposition and gate ownership

The scope of E7 is the routing decision, resolved here as **defer to the owning
epic** for every row. This preserves independent product/platform decisions and
MVP exclusion. The request to complete E7 on 2026-10-21 authorizes finishing this
routing package; it is not recorded as a platform review or delivery approval.

| E7 task | Routing decision | Remaining gate owner |
| --- | --- | --- |
| E7.1 | DMs/group DMs → E11; defer delivery | E11: conversation/history, group cap, blocking and notifications |
| E7.2 | Search → E12; defer delivery | E12 with E9/E10: index capability, retention and recovery |
| E7.3 | Notifications, presence/typing, personal triage → E11; defer delivery | E11: attention/privacy/consent; presence/typing explicitly deferred |
| E7.4 | Integrations/bots/workflows → E15; defer delivery | E15: installation authority, job operations; marketplace separately deferred |
| E7.5 | Canvases, huddles, tasks → E16; defer each independently | E16: separate build/partner/defer decisions; tasks start as proposed checklist scope, no suite expansion |
| E7.6 | Guests → E9; external/enterprise → E17; defer delivery | E9: guest lifecycle; E17: cross-org authority and enterprise operations |

No independent product/platform review or completed E6 evidence is asserted.
For future gate advancement, the owning epic must record reviewer, date,
disposition, evidence, blockers and approved scope. E6 validated v1 and each
owner's dependencies gate feature build/release, not completion of this deferred
routing inventory. No build-ready child issues are created by this package.

## Cost and reliability analysis

These are comparative design estimates, not measured PAS performance, provider
quotes or approved operating budgets. Let M be stored messages, I index bytes,
N eligible recipients per event, R bounded retry attempts, V retained document
versions, B bytes per version, J queued jobs and H media participant-minutes.
Owners must set numeric budgets and validate assumptions at product/platform
review. Without that evidence, the decision remains defer.

| Proposal | Cost drivers and failure analysis | Routing conclusion / evidence needed to advance |
| --- | --- | --- |
| DMs/group DMs | Storage grows with messages plus conversation memberships; delivery work grows as N × R. Concurrent pair creation risks duplicates; group changes risk inconsistent history grants. | E11 must benchmark group-size/fanout limits and prove transactional pair/successor invariants. Defer rather than assume channel economics apply. |
| Search | Index storage adds I to canonical M-sized history; edits/deletes add index writes and rebuilds scan retained history. Failed partial indexing risks stale results. | E12 must measure index/storage amplification and bounded query/rebuild latency; atomic writes and unavailable-during-rebuild behavior trade availability for privacy. |
| Notifications | Queue/provider work scales with event rate × N × R; retry storms can multiply cost and duplicate alerts. | E11 must cap retry/fanout, price provider delivery and test outage recovery; durable personal Activity is the fallback, not guaranteed push. |
| Presence/typing | Traffic grows with active senders × viewers × update frequency; battery use and room overflow make unbounded broadcasting unsuitable. | E11 keeps it deferred until measured demand, consent, expiry and bounded traffic fit PAS limits or an approved transport. |
| Personal triage | Storage grows with saved references per user; reminders add J and retry work. Source deletion/revocation can leave stale links. | E11 must bound saved items and due-job scans; reference-only storage reduces copied-content retention, and unavailable-source handling avoids stale excerpts. |
| Integrations/bots/workflows | External calls and J × R dominate variable spend; tenant jobs can starve others and external failures can amplify backlog. | E15 must budget per-install concurrency, execution time and retry ceilings; cancellation, dead letters and revoked-grant checks bound failure impact. |
| Canvases | Version storage grows as V × B, with autosave and search write amplification. Concurrent/offline edits risk loss or divergent history. | E16 must compare a small online editor, partner cost and defer; bound versions/autosave and validate conflict recovery. Binary sharing stays blocked on E8. |
| Huddles | Media cost scales with H, bitrate, relay fraction and region; TURN/SFU outages affect live sessions immediately. | E16 must obtain provider estimates and browser/region reliability evidence; keep text conversation as fallback and approve media independently from canvases. |
| Tasks | Checklist state is small relative to versioned canvases, but assignment fanout and reminder J can dominate; concurrent status changes risk lost updates. | E16 must bound assignment and define version/conflict semantics. Exclude standalone scheduling/dependency engines until separately justified. |
| Guests | Membership/allow-list storage grows with invited guests and allowed channels; expiry enforcement and sponsor support add ongoing work. Background-only expiry creates a revocation window. | E9 must enforce expiry in live authorization as well as cleanup and test races; quantify sponsor/revocation support before delivery. |
| External/enterprise | Identity-provider operations, audit retention, legal policy and support create fixed operating cost beyond message storage; disconnect/SCIM failures can preserve unwanted access. | E17 must fund named operations/support, prove disconnect/deprovisioning and reconcile retention policies; defer enterprise claims until evidence exists. |

PAS invariants apply to every row: use the workspace template and authenticated,
SQL-authorized actions, not platform app roles as workspace authority. Durable
state/change feed remains canonical; rooms are only bounded ephemeral hints.
Shared private binary reads remain blocked on E8. Do not promise app-visible
global browser-session inventory/revocation or an offline conflict engine.

## Acceptance test plan for owning child issues

These are proposed test cases, not executable coverage of unbuilt features.
Extend the actual registered-action harness in `qa/actions.mjs` and browser suite
when the respective design is approved; do not substitute a mock permission model.

| Case | Expected evidence |
| --- | --- |
| Anonymous, outsider, wrong workspace and owner outside a private conversation | Every new scoped action denies access without content or existence metadata. |
| DM pair creation races and group membership change | One canonical pair; successor conversation does not disclose predecessor history to added members. |
| Remove/suspend/expire membership between enqueue, delivery and source open | No newly delivered private preview or authorized source retrieval; saved links become unavailable. |
| Activity clear, mark-read and thread mute independently | No unrelated read/Activity mutation; policy selects only intended deliveries. |
| Push opt-out, DND, retry, duplicate job and provider outage | Consent respected, bounded retries/deduplication, documented fallback without content in diagnostics. |
| Presence expiry, blocked viewer, background tab and room overflow | No unauthorized activity signal; stale indicators expire and degraded behavior stays within transport limits. |
| Another user's saved-item ID | No personal triage disclosure; source access rechecked after revocation. |
| Search edits, deletion, retention and stale index/cache | No obsolete text or inaccessible hit/context; execute E12's detailed test matrix. |
| Forged/replayed webhook, excessive scope, uninstall during retry | Refused payload or grant; no later job acts with revoked installation authority; attributable audit. |
| Canvas history/export after access loss and concurrent edits | No version or export bypass; documented conflict recovery preserves authorized changes. |
| Huddle-only invitation and unapproved recording/transcription | No channel-history grant; unapproved capture features unavailable. |
| Guest expiry, cross-org disconnect and identity deprovisioning | All affected action/delivery paths revoke access with policy-appropriate audit and retention. |
| Load beyond approved per-proposal budget and recovery interruption | Bounded resource use, documented fallback/rollback and no content in metrics or room events. |

E7 routing acceptance is covered by each proposal's single owner, value,
permission boundary, threat analysis, cost/reliability analysis and MVP exclusion.
Future implementation review requires measured budgets and approved decisions;
release completion additionally requires executable results from child issues.
