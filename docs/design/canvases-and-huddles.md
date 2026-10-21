# Canvases, durable knowledge, and huddles (E16 / #14)

Status: design package complete; implementation deferred pending independent
product, security and platform review. This record proposes boundaries, not
provider selection, consent approval, provisioning or release authorization.
E12–E15 remain dependencies. No build-ready child issues are created while
review gates are open. Canvases and huddles can be approved independently.

## E16.1 — Canvas boundary

Choose a small online, conversation-bound canvas over a separate document suite
or embedded third-party editor. A channel or DM has a Canvases tab listing
multiple documents; messages may link to a document, but do not own it. Initial
scope excludes standalone documents, cross-conversation sharing, public links,
explicit document grants and assignment/reminder workflows. Checkboxes are
local checklist state, not a task-management service.

A document inherits its conversation's current read authority. Every list, read,
version, mutation, search hit and export must check current workspace and
conversation membership using the authenticated actor. Workspace owners have
no private-channel bypass. DM support waits for E11's approved membership/history
contract. New members receive history only as allowed by that contract. Explicit
grants, if later approved, must intersect source access rather than widen it.

Proposed durable model: canvases (workspace, conversation, title, current revision,
creator, timestamps, deleted marker), immutable canvas_versions (document,
revision, validated blocks, actor, timestamp), and content-free audit/change-feed
records. IDs supplied by clients are hints. Writes use registered authenticated
SQL actions; check expected revision and membership in the same transaction as
version creation, head update and audit/feed writes. Never use app.db in a user
path. Version IDs cannot bypass document authorization.

Members can create/edit; author or conversation moderator can soft-delete under
E13 policy. Archived conversations are read-only. Restore creates a new revision
and requires current edit authority. Conversation deletion cascades to canvases,
versions and search entries under the approved retention/legal-hold policy;
workspace removal revokes access immediately. No independent indefinite version
retention: E13 must approve a bounded version/retention policy before building.

Export is an authenticated, freshly authorized Markdown/JSON response with safe
filenames, no shared object URL and no server-side export cache. Export includes
only the requested authorized revision. Deletion cannot recall an already saved
local copy. E12 indexes canonical text and titles with live authorization and
atomic edit/delete lifecycle; until E12 is ready, canvas search stays unavailable.
Binary embeds/downloads remain blocked on verified E8 member-scoped private reads.
The attachment server prototype does not establish platform support or deployment
approval. Links to messages and mentions reauthorize their targets on open.

## E16.2 — Small block editor

Proposed v1 schema: ordered blocks with stable IDs and a closed type enum: plain
text, ordered/unordered list, checkbox, safe link, member mention and code.
No HTML, executable embeds, inline scripts, arbitrary styles or remote previews.
Render escaped text; links allow only http/https, reject unsafe schemes and use
safe external-link attributes. Mentions store member IDs, validate membership
at save, and never grant access or silently notify outside the conversation.
Code is inert text with an optional allow-listed language label.

Proposed limits for review: 100 blocks, 64 KiB UTF-8 serialized document, 200-char
title. Validate server-side; reject unknown types, duplicate IDs, malformed URLs
and oversized payloads before writes. Use bounded pagination for lists/versions.
Online autosave debounces edits by 1 second with at most one in-flight save and
one coalesced pending draft. A stable mutation ID makes retries idempotent.
Show Saving, Saved, Offline and Conflict states accessibly. Failed saves retain
the draft in memory; no automatic persistence to browser storage.

Use optimistic concurrency, not a claimed offline merge engine. A revision
mismatch returns conflict without writes. Keep the local draft and fetch the
current authorized revision for comparison; let the member copy/reapply changes
and submit against the new revision. Never silently replace remote edits. On
confirmed access loss, clear document, versions and draft from memory; on a
transient outage retain the draft until recovery or explicit discard. Navigation
with an unsaved draft prompts before discarding. Reload can lose unsaved work
and must be explained in the editor.

Use native labeled inputs and semantic lists/checkboxes, keyboard block-add,
move-up/down controls as alternatives to drag, visible focus and status live
regions. Code editing must allow keyboard escape from the field. Mobile uses a
single column, touch controls, reading mode and explicit Edit entry; test virtual
keyboard, 200% text, screen-reader reading order and narrow viewport reflow.

Version storage costs approximately retained revisions × average document bytes;
autosave amplifies write/audit/index load. Review debounce, version compaction,
per-workspace quotas and retention against measured E10 action limits. A partner
editor adds licensing, data residency and grant synchronization costs; defer is
the fallback if safe conflict/retention behavior cannot be supported.

## E16.3 — Media infrastructure evaluation

Choose **defer provider selection and keep huddles off**. Prefer a managed SFU
trial over operating media infrastructure initially, subject to the evidence
below. Browser peer mesh is rejected for unbounded upload/fanout and lack of a
central enforcement point. PAS rooms are not media or signalling: limits are
32 peers, 100 messages/second, 4 KB and no replay. They may carry body-free durable
state invalidation hints only; reconnect refetches canonical authorized state.

Primary documentation reviewed 2026-10-21; capability descriptions are vendor
claims, not Slackie deployment or privacy validation:

| Candidate | Evidence and tradeoff | Unresolved review gate |
| --- | --- | --- |
| LiveKit managed or self-hosted | [Self-hosting](https://docs.livekit.io/transport/self-hosting/) documents SSL, TURN and multi-region operations; [token grants](https://docs.livekit.io/frontends/reference/tokens-grants/) separate room join and recording authority and describe deployment-specific revocation. Managed service reduces operational scope; self-hosting adds upgrades, capacity and incident duty. | Obtain managed quote, exact revocation semantics, region placement, DPA/subprocessors, retention and deletion evidence; benchmark self-hosted TURN/SFU operations before choosing that alternative. |
| Cloudflare Realtime SFU + TURN | [Pricing](https://developers.cloudflare.com/realtime/sfu/pricing/) describes egress billing and avoiding double charges between TURN and SFU; [TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) distinguishes enterprise support/SLA terms. Lower-level infrastructure requires an application signalling and moderation layer. | Verify permitted regions/residency, signalling design, identity isolation, revocation, privacy terms, support and measured total cost. |
| Defer | Existing authorized text conversation remains usable without media infrastructure. | Selected until all provider, security, cost and operations evidence is accepted. |

Cost model: participant-minutes × subscribed bitrate × relay/egress rate plus
signalling, provider minimums, telemetry and operational support. For a proposed
8-person, 30-minute session at 1 Mbit/s received per participant, receiver egress
is about 1.8 GB (decimal); this excludes overhead and is an illustrative workload,
not a quote. Measure audio-only, video simulcast and screen-share separately.
Approve numeric monthly spend/quota, hard session cap and alerts before enabling.

Trial matrix must cover current Chrome, Firefox, Safari, Edge, iOS Safari and
Android Chrome; exact tested versions and results must be recorded. Test UDP
blocked, TURN/TLS, VPN, regional latency, packet loss, device switching, sleep,
reconnect and screen-share capability differences. Approve region/failover
placement and deletion/logging terms with security/privacy reviewers; do not
claim end-to-end encryption from transport encryption alone. Server-side flag
and provider credentials default off; disabling stops joins and terminates active
sessions. Missing kill/disconnect enforcement blocks release.

## E16.4 — Huddle lifecycle and authority

A durable huddle belongs to one channel or DM, with session ID, binding, host,
state, expiry and policy version. States: creating → open → ending → ended;
provider creation failure ends the session and exposes retry without phantom
presence. Creation/join/end are idempotent and auditable without media content.
Concurrent starts resolve to one active huddle per conversation.

Normal members require current workspace/conversation access. A separately
approved guest policy may let a host invite a named authenticated participant
using an expiring, revocable, session-only grant. Until E9 guest policy is ready,
that invitation mode stays disabled. A huddle-only grant permits only joining
that session and seeing its minimal participant roster; it never inserts
workspace/channel membership or grants messages, files, canvases, search,
conversation metadata or history. No bearer invitation can substitute for actor
identity. Host invitation requires current authority and cannot cross tenants.

Join checks current authority and ban state server-side before minting a
short-lived, identity-bound, room-scoped provider credential. No recording,
administration or arbitrary-room grant. Recheck on reconnect/renewal; membership
removal, guest expiry, kick, policy change and end must disconnect the participant
and revoke re-entry. Short token expiry alone is insufficient for active sessions;
provider-enforced disconnect and stale-token denial need race tests. If the
provider cannot satisfy this contract, it cannot ship.

Preflight shows mic/camera choices, device test and permission failures before
joining. Microphone and camera start off, screen sharing requires a separate
explicit gesture and visible stop control. Never capture from a dismissed
preflight. Show connecting/live/reconnecting, mute, participant list, degraded
quality and ended states with keyboard access and screen-reader status. Stop all
tracks on leave/end/navigation/sign-out. Host/moderator may remove, ban re-entry,
lock joins or end; remote unmute is forbidden. Host departure ends the huddle
unless authority transfers explicitly to a current eligible member.

Provider outage or failed preflight offers retry or return to authorized text.
Huddle-only invitees receive an unavailable screen, never a history fallback.
Reconnect revalidates grants and session state; no automatic reactivation of
camera/screen capture. Proposed trial cap: 8 participants, 60 minutes, no phone
bridge, background recording, external bot or persistent media asset.

## E16.5 — Consent boundary

All derived capture features default unavailable on both UI and server. Workspace
admin preference or joining a session is never participant consent. Device
permission is not recording consent. These are separate decisions:

| Capability | Required independent approval and enforcement |
| --- | --- |
| Captions | Explicit participant opt-in to the processor, destinations and whether ephemeral text is stored; default no persistence. |
| Notes | Deliberate manual authoring only after its access/retention policy is approved; automated notes need separate processing consent. |
| Recording | All current participants accept purpose, media types, readers, storage region and retention before any capture token/job can exist. |
| Transcription | Separate acceptance of speech processor, language, storage, readers, retention and deletion; recording approval does not imply this grant. |
| AI summary | Separate approval of model/provider, inputs, recipients, reuse/training terms, retention and deletion; transcript consent does not imply AI consent. |

Future consent records bind actor, session, capability and immutable terms version
with timestamp and withdrawal. Consent collection is distinct from starting
capture. A new arrival, changed terms, missing consent or withdrawal pauses capture
before their media is subscribed; if this cannot be enforced, end capture/session.
A persistent visible/audible indicator and accessible notice accompany approved
capture. Disable provider recording/transcription/agent endpoints and credentials
until approved; hiding buttons is insufficient. External device capture cannot be
technically prevented and must not be represented as prevented.

Retention approval must specify a numeric duration per artifact, authorized
readers, storage/residency, backups, legal-hold precedence, processor deletion,
withdrawal behavior and a deletion SLA with verifiable evidence. No default
indefinite retention. Deletion must cover originals, transcripts, notes, summaries,
indexes, caches and provider copies; stop pending derivation jobs. Failed deletion
is visible to operators without content in logs. A capture feature remains
unavailable until its own terms and technical deletion controls are approved.

## Review gates and delivery sequence

| Gate | Accountable reviewer | Evidence required / current disposition |
| --- | --- | --- |
| Canvas product/access | Product + security | Inheritance, roles, history, limits and retention accepted; proposed, awaiting review. |
| Canvas platform | PAS + E10/E12/E13 owners | Atomic revision/idempotency, search deletion, retention and load evidence; blocked pending dependencies. Binary assets additionally require E8 verification. |
| Media provider | Operations + security/privacy | Region/browser trial, revocation, DPA, cost ceiling and incident/kill-switch evidence; no provider selected. |
| Huddle identity | E9/E11/E13 owners | Guest and DM contracts, moderation and join/history isolation; invitation mode blocked. |
| Capture, per capability | Product + privacy + security | Separate consent terms, retention values and enforcement/deletion tests; every capability disabled. |

For each review record named reviewer, date, decision, evidence links, approved
scope and residual blockers. This document does not claim those reviews occurred.
After relevant gates close, split child issues for (1) canvas schema/actions and
conflict tests, (2) editor/accessibility, (3) authorized search/export lifecycle,
(4) provider adapter and session authority, (5) preflight/media UI and operations.
Capture capabilities require separate later issues and approvals. Provision no
PAS/provider resources without explicit approval. Release requires actual action,
browser, integration and load results, then a bounded flag rollout and rollback.

## Acceptance scenarios for future implementation

These are design test specifications, not executable proof of unbuilt features.
Use actual registered-action SQL, browser UI and provider integration in child
issues; a mock authority model is insufficient. Existing application tests still
run unchanged for this design-only package.

| ID | Setup / operation | Required result |
| --- | --- | --- |
| C1 | Anonymous, outsider or other-tenant actor guesses canvas/version/export IDs | Deny without title, blocks, existence or version metadata. |
| C2 | Owner outside private channel reads canvas, search or export | Deny; no owner bypass. |
| C3 | Remove member between list and read/save/export | All subsequent operations deny; clear local private state. |
| C4 | Two editors save against one revision; retry same mutation | One succeeds, one conflicts preserving draft; retry creates no duplicate version/audit. |
| C5 | Offline/503 during autosave then recovery; confirmed 403 separately | Transient failure preserves draft; access loss clears it; no silent overwrite. |
| C6 | Unsafe URL, HTML, unknown block, duplicate ID or oversized content | Reject malformed content server-side; safe text rendering never executes code. |
| C7 | Edit/delete/archive/restore and retention sweep | Search/version/export follow current lifecycle; archive refuses writes; deletion follows approved policy. |
| C8 | Keyboard/screen reader, mobile keyboard, 200% text and unsaved navigation | All block operations accessible; visible save/conflict state and discard protection. |
| H1 | Huddle-only invitee requests messages, canvas, attachments, search and channel details | Session join may succeed; all underlying conversation reads deny; membership unchanged. |
| H2 | Wrong actor uses invitation/token; expired/revoked grant; wrong room/tenant | Join/renewal denied, no existence leak or broader grant. |
| H3 | Kick/removal/expiry/end races with join and reconnect, including stale token | Active transport disconnects; no re-entry, history grant or lingering tracks. |
| H4 | Host leaves, concurrent starts, duplicate end and provider create failure | One active session; explicit transfer or end, idempotent transitions and safe retry. |
| H5 | Deny device permission, cancel preflight, leave, sign out, stop screen share | No unintended capture; tracks and indicators stop correctly. |
| H6 | Provider outage, UDP blocked, regional loss, mobile sleep and flag disable | Tested TURN/fallback; reauthorize reconnect; kill switch stops sessions. Invitees never see history fallback. |
| S1 | No consent; forged client requests capture/caption/transcript/summary endpoints | Every disabled capability denies server-side; no provider job, token or artifact. |
| S2 | Recording consent only, new participant, withdrawal or changed terms | No implied transcription/AI grant; pause before unconsented media or terminate. |
| S3 | Approved artifact expires/deleted while a derivation job retries | Originals and derived/provider copies removed within approved SLA; no regeneration. |
| S4 | Attempt consent replay from another session/actor/terms version | Deny; independent capability terms enforced with content-free audit. |

Design review check: each E16 task maps to a section above; H1 covers invitation
isolation and S1–S4 cover the consent/retention acceptance boundary. None of these
scenarios is marked passed until the corresponding implementation exists.
