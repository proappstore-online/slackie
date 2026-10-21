# Post-MVP collaboration routing proposal (E7 / #11)

Status: proposed, awaiting product and platform review. All proposals below are
excluded from MVP until separately approved. This routing document does not close
the owning epics, approve delivery, or authorize PAS provisioning.

## Ownership and proposal assessments

Each row has one accountable owning epic. Dependencies provide contracts rather
than shared ownership. The proposals are independent: approving one does not
approve adjacent features or expand the MVP.

| Proposal / E7 task | Owning epic | Standalone value case | Proposed permission boundary | Threats and required mitigations | Cost and reliability assessment required before approval |
| --- | --- | --- | --- | --- | --- |
| Direct and group messages / E7.1 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.5 | Let a small team resolve a private question without creating a channel. | Current workspace and conversation membership on every read/write; canonical pair resolution; group membership changes create a successor conversation. Approve group cap, history, guest and block/report rules first. | Guessed IDs, unintended history disclosure, harassment and membership races: test SQL scope, atomic successor creation, blocking and reporting. Owners have no private-history bypass. | Measure conversation growth, notification fanout and moderation load; bound group size; verify idempotent creation and recovery through E10. |
| Search and retrieval / E7.2 | [E12](../epics/EPIC-12-search-and-retrieval.md) | Recover an authorized past decision without scrolling history. | Recheck current workspace/channel membership before hits, context or metadata; public-channel discovery grants no message access. | Index/cache leakage, stale deletion, query logging: live authorization joins, atomic index lifecycle and content-free diagnostics. | Validate PAS indexing support, storage/write amplification, bounded query latency and rebuild recovery; see the [search proposal](authorized-search.md). |
| Notifications / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.1–E11.4 | Surface actionable mentions and replies without forcing constant timeline scanning. | Personal Activity and preferences; current source access at delivery/open; push requires separate opt-in. Read cursors and Activity clearing remain independent. | Lock-screen disclosure, duplicate alerts, post-removal delivery: privacy-safe previews, authorization at dispatch, deduplication and revocation-aware queues. | Budget fanout, queue retries and delivery-provider cost; approve DND/time-zone policy, fallback and failure visibility. No delivery guarantee from rooms. |
| Presence and typing / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.7 | Reduce uncertainty about an ongoing exchange, if research justifies the privacy cost. | Explicit consent and visibility rules, including guests and blocked users; ephemeral state grants no history access. | Activity surveillance and stale online claims: define expiry, consent withdrawal, background behavior and abuse controls before enabling. | Remain deferred; measure battery/traffic and viewer fanout. PAS rooms are body-free no-replay hints capped at 32 peers, 100 messages/second and 4 KB; degraded behavior must be explicit. |
| Personal triage / E7.3 | [E11](../epics/EPIC-11-attention-and-dms.md), E11.6 | Let a member return to work later without changing anyone else's read state. | Saved/reminder state belongs only to its user; source links reauthorize on every open. | Cross-user saved-item reads and retained excerpts after revocation: owner-scoped SQL, minimal source references and unavailable-source behavior. | Bound per-user storage and reminder jobs; approve retry/deduplication and deletion behavior independently from notifications. |
| Integrations, bots and workflows / E7.4 | [E15](../epics/EPIC-15-integrations-and-workflows.md) | Automate a repetitive handoff with attributable, revocable actions. | Explicit installation and actor grants intersect current channel access; consent/scopes and bot identity cannot exceed the grant. | Forged/replayed events, credential theft, confused deputies and runaway jobs: signatures/expiry, encrypted credentials, rotation, rate limits and audit. | Price webhook/job volume, concurrency, retries and dead letters; prove disable/uninstall stops authority. Marketplace remains separately deferred. |
| Canvases and durable knowledge / E7.5 | [E16](../epics/EPIC-16-canvases-and-huddles.md), E16.1–E16.2 | Preserve a maintained decision or checklist beside a conversation. | Approve inheritance versus explicit grants, version/history access, export and search policies. Shared binary assets depend on E8. | Document/history leakage, unsafe rich text and lost edits: scoped reads, safe rendering and explicit conflict behavior. | Decide build/partner/defer separately from huddles; estimate version storage, indexing and autosave load. PAS supplies no app-owned offline conflict engine. |
| Huddles and synchronous media / E7.5 | [E16](../epics/EPIC-16-canvases-and-huddles.md), E16.3–E16.5 | Resolve a time-sensitive conversation through an optional live session. | Session invitation never grants channel history; approve join/moderation rules. Recording, captions, transcription and AI summaries each need separate consent and retention decisions. | Unauthorized joins, screen/voice disclosure and covert capture: authenticated sessions, device preflight, visible consent and enforceable lifecycle. | Separate build/partner/defer decision; measure SFU/TURN costs, regions, browser support and fallback. PAS rooms cannot serve as media/signalling without independently verified transport suitability. |
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

For every proposal, record reviewer, date, disposition (approve/amend/defer),
evidence links, remaining blockers and approved scope in this section before
advancing a gate. No reviewer decisions or completed E6 evidence are recorded
here yet. E7's routing checklist remains pending review; no child issues are
build-ready by virtue of this document.

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

Review completion requires evidence for each proposal's single owner, value,
authority, threat mitigations, cost/reliability budget and explicit MVP exclusion.
Release completion additionally requires executable results from its child issues.
