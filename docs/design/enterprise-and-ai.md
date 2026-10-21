# Organization scale, enterprise controls, and AI (E17 / #15)

Status: design deliverable complete; independent review and implementation remain
pending. This package covers E17.1–E17.4. It does not assert enterprise readiness,
select a vendor, approve policy, or authorize PAS provisioning. Create build-ready
child issues only after their decision gates have recorded approval.

## Existing authority and platform boundary

The current app has workspace memberships (owner/admin/member), channel
memberships, registered SQL actions, message/thread/reaction/mention reads and
content-free audit/activity writes. There are no organizations, federated
identities, SSO/SCIM adapters, legal-hold service, search index or AI service.
`get_channels` permits workspace-scoped public-channel discovery; message reads
still require joining that channel. Private-channel names require membership,
including for workspace owners. Preserve that distinction.

For every source read, use the authenticated actor, current workspace membership,
current channel membership and canonical source scope, plus deletion and approved
history/retention rules. Client IDs are hints. Organization roles, domain claims,
external sponsorship, search indexes and model output cannot replace this
predicate. Apply it before snippets, counts, exports or model context, and again
before delivery. Fail closed when authority cannot be checked. No global fetch
followed by client filtering. Future DM/canvas access must use their approved
conversation predicate rather than treating them as public channels.

All durable user operations remain registered authenticated SQL actions, with
role checks in SQL, additive migrations and guarded content-free audit/activity
writes in the same transaction. No app.db in user paths. Approved background
workers need separately scoped service authority, not a general admin identity.
PAS rooms remain body-free hints, bounded to 32 peers, 100 messages/second and
4 KB with no replay; use E10 durable recovery and degraded polling at scale.
PAS offers no app-visible global browser-session inventory/revocation or offline
conflict engine. The attachment server prototype does not establish E8 platform
support, so binary external sharing, export and AI ingestion remain blocked until
member-scoped private reads are verified. See [research foundations](../research-foundations.md).

## E17.1 — Organization model and scale

Choose an organization as a policy/directory boundary above independently
protected workspaces, never a merged content tenant. Proposed entities:

| Entity | Essential fields / invariant |
| --- | --- |
| organizations | Opaque ID, name, primary owner, lifecycle, policy revision; one active primary owner. |
| organization_members | Organization, authenticated subject, owner/admin/member role, lifecycle; unique pair. |
| organization_workspaces | Organization, workspace, state; one active parent per workspace. |
| organization_policies | Organization, revision, typed restrictions, actor, effective time; immutable revisions. |
| workspace_policy_overrides | Workspace, parent revision, stricter restrictions; no widening parent constraints. |
| directory_preferences | Subject, approved profile fields and discovery scope; no conversation-derived directory data. |

Org owners manage policy, billing/contact and delegated admins; org admins manage
only approved directory/lifecycle operations; members see eligible directory and
workspace discovery. None acquires message or private-channel access. Workspace
roles stay separate. Linking/unlinking a workspace requires step-up and consent
from both primary owners, a policy compatibility check, an idempotent conditional
transition and audit. Prevent orphaning the last org owner. Do not silently copy
workspace members into org membership or grant org members workspace membership.

Inheritance chooses the restrictive intersection: disabled capabilities stay
disabled, domain allow-lists intersect, permitted regions intersect, maximum
retention periods take the minimum. Legal holds are separate preservation rules,
not a longer ordinary read entitlement. Incompatible legal minimum/maximum or
empty region policies block activation and require review; do not silently pick
a winner. A workspace can tighten controls, never weaken an org restriction.
Show effective value, source and conflict to admins without content access.
Policy changes increment a revision, invalidate pending jobs/grants, and audit
before clients are notified. Concurrent edits use expected revision; retries are
idempotent and conflicts preserve the draft.

Directory exposes only consented minimal profile fields to active org members;
never infer private participation, activity or messages. Discoverable workspaces
are explicitly opted in; private workspace names remain hidden. Request-to-join
creates a request, not membership. Domain ownership proves control of a domain,
not control of every identity using it. Guests/external identities remain under
E9 scope/expiry and receive no org-wide directory by default.

Proposed validation envelope, not a service commitment: 100 workspaces per org,
10,000 directory members, pages of at most 50 with actor/scope-bound keyset cursors.
Measure query plans, authorization join cost, p95/p99 latency, policy propagation,
rate limits and noisy-neighbor behavior with skewed tenants and churn. Product
and operations must approve numeric latency/error budgets, quotas, support hours,
on-call ownership and escalation before advertising a scale limit. Retain
workspace-scoped indexes; org ID alone never authorizes a message scan.

## E17.2 — External collaboration

Choose a separately bound shared conversation, not cross-tenant workspace joins
or mirroring entire channels. Proposed records: connection (two organizations,
sponsor on each side, immutable consent terms/policy revision, expiry, state),
shared conversation binding (local conversation IDs on both sides), explicit
participant grants and immutable content provenance. Authenticated subject IDs
are issuer-qualified; matching emails or verified domains never merge identities.
A provider/federation and identity-linking contract remains a review gate.

Lifecycle: proposed → awaiting both sponsors' consent → active → suspended →
disconnected. Sponsors require delegated external-collaboration privilege and
step-up. Both sides approve participant scope, domain verification, retention,
region, moderation, audit and notice terms before activation. Domain challenges
are expiring and reverified; losing verification suspends new joins and sharing.
Participant grants require current local workspace/channel membership AND active
connection AND explicit remote scope. Remote participants receive only the shared
conversation, no workspace directory, other channels, DMs, history or attachments
by implication. Define a join-history baseline and show the external audience
persistently in composer/header and before sending.

Every send/read/edit/search/export rechecks the binding, both policies and actor
scope. Moderation records retain origin and attribution; edits/deletes propagate
idempotently through a durable outbox with monotonic revisions and tombstones.
Out-of-order events cannot resurrect deleted content. During replication/authority
outage, suspend delivery and show unavailable rather than serve stale authority.
Rooms carry invalidation only. Attachments stay disabled pending E8.

Either side can disconnect immediately: atomically disable new operations and
queued delivery, revoke grants, stop subscriptions/jobs and invalidate derived
indexes/caches. A reconnect is a new consented connection, not revival of old
grants. Existing downloaded copies cannot be recalled. Before launch both sides
must approve whether canonical historical copies are deleted or retained, exact
retention/hold precedence and processor deletion evidence; no indefinite default.
Normal retained-history reads still require current membership and policy. Audit
partitions expose each organization's own actors/events and minimal remote
provenance; no partner directory, internal cases, secrets or conversation bodies.

## E17.3 — Enterprise lifecycle and evidence

All controls below remain unavailable until the listed evidence exists. No badge,
settings toggle or documentation may imply implemented SSO, compliance, residency,
DLP, recovery guarantees or enterprise support merely from this design.

| Control | Proposed behavior | Release evidence / owner |
| --- | --- | --- |
| SSO | Use a PAS-supported identity adapter; validate issuer, audience, nonce/state, signature, expiry and subject binding; prevent alternate-login bypass of enforced policy. Recovery is step-up, tightly scoped and audited. | PAS/identity owner: verified adapter, key rotation/replay tests, enforcement for existing sessions, lockout/recovery drill. If PAS cannot enforce it, keep disabled. |
| SCIM | Scoped per-org credential; immutable external subject ID; idempotent create/update/deactivate; reject privilege escalation, cross-tenant IDs and last-owner removal. | Identity/security: replay, ordering, retries, token rotation and deprovision propagation tests. Deactivation revokes app authority without claiming global browser-session revocation. |
| Delegated admin | Explicit capability and tenant scope, expiry and step-up for sensitive operations; no automatic private-content read. | E9/security: capability matrix, negative SQL tests, transfer/last-owner race tests. |
| Legal holds | Separately approved case and custodian scope; preservation overrides purge, never ordinary membership. Apply before retention jobs; audit creation/change/release. | Privacy/legal + E13: authority/notice policy, hold-vs-purge races, release and backup behavior, evidence integrity. |
| eDiscovery | Approved, time-limited case workflow; normal search/export continues to require conversation membership. Exceptional preservation/review is a separate reviewed authority and cannot ship through normal endpoints. | Legal/security: dual approval, minimal scope, audited access, expiry, evidence manifest and deletion verification. No exceptional content endpoint is authorized here. |
| DLP | Approved types/rules, inline server enforcement before commit/delivery; unavailable scanner blocks protected sends with retry. Safe user feedback and restricted appeals. | Security/privacy: false-positive/negative corpus, scanner residency, bounded timeouts and no pre-scan delivery. Shared binaries additionally require E8. |
| Audit stream | Transactional content-free outbox; scoped signed delivery, deduplication ID, durable cursor, retries/backoff, gap alerts and bounded dead-letter handling. | E13/operations: outage/replay/tamper/rotation tests, sink scope and retention agreement. Never bodies, prompts, emails, tokens or signed URLs. |
| Data residency | Explicit region for primary data, replicas, indexes, logs, backups and every processor; reject unapproved failover. | PAS/privacy: contractual and deployed placement evidence, subprocessor map, support-access policy and failover drill. A region selector alone proves nothing. |
| Backup/restore | Encrypted backups with approved retention and key ownership; isolated restore, reconcile deletion ledger/holds/policy before serving any reads. | PAS/operations: numeric RPO/RTO, restore drill, integrity evidence and quarantine test; no values promised before measurement. |

Retention approval must set numeric durations for messages/edits, identities,
audit, exports, indexes, AI artifacts and backups, deletion SLAs and hold
precedence. Export manifests include scope, revision and integrity checks, not
unbounded org content. Download uses fresh actor authorization, expiry and no
public link; jobs reauthorize before each chunk and final delivery. Membership
loss cancels and deletes inaccessible partial output. Investigate processor
failure without logging content; alert operators and keep affected features off.

## E17.4 — AI boundary

Choose retrieval-only assistance with no tools, autonomous writes, invitations,
role changes or external network access. Organization and workspace enablement,
plus deliberate user opt-in to the disclosed processor/purpose, are all required.
Default off on server and UI. Opt-out prevents new jobs and stops pending jobs;
revocation/deletion follows the approved retention terms. Huddle transcription
and AI summaries additionally require the distinct E16 participant consent gates.

Pipeline: authenticate → evaluate effective policy/consent → obtain currently
authorized canonical sources through approved E12 retrieval → bound context →
invoke approved vendor → reauthorize every source → deliver escaped answer and
citations. Never fetch an org-wide corpus under a service account and filter it
later. Indexes/vectors carry source ID, scope, revision and deletion state; they
are retrieval aids, never authority. Recheck source revision and live membership
before model submission and response delivery. If any included source becomes
inaccessible or changes, discard the entire answer and regenerate from current
authorized inputs; redacting its citation cannot remove inferred private text.
Cancel streaming and clear client state on access loss. Disable output streaming
for v1 so validation finishes before any answer is exposed. Already delivered
text cannot be remotely recalled.

Summaries are on-demand for a bounded selected conversation/time range, never
org-wide scheduled digests or hidden private context. Every factual claim needs a
source citation with source ID/revision and an independently authorized deep link.
Unavailable links show generic unavailable without title/existence leakage.
When evidence is insufficient, abstain. Label generated content and allow users
to inspect sources and report incorrect/unsafe answers. Model output cannot
assert permissions, override moderation or execute content. Copying/sending an
answer into a conversation is a separate explicit user action and must not share
sources with an audience lacking source access; defer that sharing mode until
recipient authorization and provenance checks exist.

Treat messages, files, links and retrieved text as untrusted data, including text
that impersonates system instructions. Separate trusted instructions from source
text, label provenance, bound input sizes, prohibit URL fetching/tools/secrets,
render output as inert escaped text, validate citation IDs against supplied
sources and reject fabricated ones. Prompt wording alone is not a security
boundary. Red-team instructions to reveal other tenants, change roles, fetch URLs
or disclose secrets must fail through missing capabilities and source authority.

No model/vendor selected. Privacy/security must approve region, DPA,
subprocessors, training/reuse prohibition, vendor prompt/output retention,
deletion API/evidence, incident terms, encryption and per-tenant isolation.
Vendor defaults are not evidence. If zero-retention terms or residency cannot
meet approved policy, leave AI off. No content-bearing shared cache or persistent
browser storage; initial mode uses transient context/answer memory. Define exact
server/vendor timeout and deletion limits before enabling; no indefinite debug
traces, prompt logging, cross-user response reuse or training on feedback.
Feedback defaults to category/rating plus job ID; quoted content is a separate
explicit opt-in with approved access and retention.

Proposed trial bounds: 20 sources, 16,000 input tokens, 2,000 output tokens,
30-second deadline, one active request per actor. Validate limits server-side,
rate-limit per actor/workspace/org and reserve per-org cost budget atomically
before invocation. Enforce numeric daily spend and alerts approved by operations;
provider usage reconciliation releases reservations idempotently. Timeout,
provider refusal, quota and kill switch return accessible retry/unavailable
states without partial answer or sensitive diagnostics. Kill switch cancels jobs
and clears pending context. Measure citation accuracy, abstention, source leakage,
latency and cost against an approved corpus before a bounded pilot.

## Review gates and sequencing

| Gate | Accountable reviewer | Decision/evidence required; current state |
| --- | --- | --- |
| Organization | Product + E9/security | Roles, membership, inheritance conflicts, directory privacy and lifecycle; proposed, not approved. |
| External | Both sponsors + identity/privacy/security | Federation, consent/history, retention/holds, disconnect, partitioned audit; blocked pending contract. |
| Enterprise | PAS + E13/legal/operations | Per-control evidence above, ownership, numeric budgets and incident/recovery drills; unavailable. |
| AI | Product + E12/E16/privacy/security/operations | Retrieval/consent, vendor terms, red-team/citation corpus, deletion and cost caps; default off. |
| Scale/release language | Operations + security + product | Measured quotas/SLOs, support/rollback runbooks and claim-to-evidence review; no enterprise claims approved. |

For each gate record named reviewer, date, decision, scope, evidence links and
remaining blockers; authoring this package is not independent review. E9–E16
maturity remains a dependency, and binary paths additionally require E8. After
gates close, split scoped child issues for organization schema/actions and UI,
external identity/transport, each enterprise adapter, and AI retrieval/service/UI.
No child issues or PAS/provider resources are created here. Each release needs
actual SQL, browser, adapter integration, load and failure tests; roll out behind
server flags with an owned rollback/kill switch and incident escalation.

## Acceptance test specification

These scenarios specify future implementation tests, not proof that unbuilt
services work. Use actual registered SQL plus real adapter/provider sandboxes;
a parallel mock permission model is insufficient. Existing SQL boundary
regressions in `qa/actions.mjs` protect today's prerequisite only.

| ID | Setup / operation | Required result |
| --- | --- | --- |
| O1 | Anonymous, other tenant or org admin guesses workspace/channel/source IDs | No content or private metadata; org role never bypasses membership. |
| O2 | Org member discovers workspaces or requests join | Only opted-in names; request grants no message/channel authority. |
| O3 | Workspace override weakens policy; conflicting retention/regions | Reject weakening; block conflict without silent fallback. |
| O4 | Concurrent policy update, last-owner removal, repeated workspace link | Conditional winner; no owner loss, duplicate link or audit side effects. |
| O5 | 100 workspaces/10,000 members, skew/churn and pagination | Approved budgets met, bounded pages, no cross-scope cursor/data leakage. |
| X1 | One sponsor consents; forged domain or same-email foreign identity | Connection remains inactive; no auto-link or access. |
| X2 | Active external participant guesses local directory/private IDs | Shared conversation only, explicit history baseline; all other data denied. |
| X3 | Disconnect/revoke during queued send, page or export | No subsequent delivery; jobs/caches/grants invalidated and repeat disconnect safe. |
| X4 | Reordered edit/delete, reconnect and partner audit reads | No resurrection or old-grant revival; audit partitions omit partner secrets. |
| L1 | Invalid/replayed SSO assertion, stale key, alternate login | Reject; approved enforced policy cannot be bypassed; tested recovery path. |
| L2 | SCIM retry, cross-org ID, deactivation race, last owner | Idempotent, scoped, no escalation; deactivation revokes app reads immediately. |
| L3 | Admin normal export of private channel without membership | Deny even for legal hold; preservation does not grant normal read authority. |
| L4 | Hold races purge; release hold; restore old backup | Preserve correctly; reconcile current deletion/authority before serving restored data. |
| L5 | DLP outage/rejection and retry | No unscanned commit/delivery; bounded safe feedback and audited disposition. |
| L6 | Audit sink outage, replay, tampering or stolen expired token | Durable recovery/deduplication, gap alerts, scoped denial and no content logs. |
| L7 | Region failure or backup/processor outside policy | No unapproved failover; feature unavailable and operator alert. |
| L8 | Export job loses membership between chunks and download | Cancel and remove partial artifacts; no public or stale download. |
| A1 | AI flag/consent missing, opt-out or huddle consent missing | No provider call, job or artifact; opt-out stops pending work. |
| A2 | Org owner/private non-member, outsider, removed member or guessed source | No source text/counts in context, answer or citations. |
| A3 | Membership/source changes between retrieval, invocation and delivery | Recheck, cancel/discard whole derived answer and regenerate only if authorized. |
| A4 | Source says ignore rules, reveal tenant, change role or fetch URL | No external fetch/tool/authority; only approved sources, inert output. |
| A5 | Fabricated citation, unsupported assertion or insufficient evidence | Reject unsupported citation/answer or abstain; links reauthorize. |
| A6 | Deleted/expired source survives in vector/cache, summary or backup | No retrieval/delivery; purge derived copies under approved SLA with evidence. |
| A7 | Cross-user cache, feedback, diagnostic and vendor-log inspection | No shared private answers, content logs, training or unapproved retention. |
| A8 | Concurrent quota reservations, retry, timeout, kill switch | No double charge or cap bypass; bounded cancellation and no partial answer. |
| U1 | Workspace switch/sign-out/removal with late response | Clear private state; late result cannot repopulate it. |
| U2 | Keyboard/screen reader, narrow viewport, outage and policy conflict | Labeled consent/citations, visible external audience, accessible status and safe retry. |
| G1 | Review customer-facing enterprise/security claims | Each claim links to current deployed evidence and operations owner; unsupported claims withheld. |

Issue scope is the design package above. Feature implementation remains blocked
at the recorded gates; passing current regression tests is not evidence of SSO,
SCIM, federation, eDiscovery, residency, backup or AI functionality.
