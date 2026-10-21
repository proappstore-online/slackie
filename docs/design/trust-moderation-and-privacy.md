# Trust, moderation, administration and privacy (E13 / #18)

Status: design package complete; independent review and policy approval pending.
This covers E13.1–E13.6. It does not authorize provisioning, exceptional access,
production moderation, or privacy promises. Build-ready child issues follow
recorded approval of the gates below, as required by #18.

## Baseline and authority

The current React app uses 47 authenticated registered SQL actions, workspace
owner/admin/member roles, explicit channel membership, message tombstones, and
transactional content-free audit/activity records. It has no durable case queue,
appeal service, legal holds, export jobs, domain policy or account deletion worker.
Existing message deletion permits the author or a workspace owner/admin, always
with current workspace AND channel membership. Role alone never grants private
content access. Existing role/removal actions protect owners; primary ownership,
step-up and member lifecycle remain E9 dependencies.

Every future durable user read/write must be a registered authenticated action;
use additive migrations and SQL predicates, never app.db in a user path. Bind the
actor from :__user_id. IDs from the client confer no authority. Join canonical
workspace, target and channel scope before returning bodies, names, counts or
notifications. Removal takes effect on the next operation, including queued work.
Rooms carry only body-free refetch hints, with no replay, at PAS limits (32 peers,
100 messages/second, 4 KB); E10 durable recovery handles missed changes.
See [research foundations](../research-foundations.md) and
[security and trust](../security-and-trust.md).

## E13.1 — Cases, evidence and confidentiality

Proposed tenant-scoped entities (none exists yet):

| Entity | Required fields and invariant |
| --- | --- |
| moderation_cases | Opaque ID, workspace, target type/ID, category enum, state, assigned reviewer, policy revision, expected version, timestamps. Target must belong to this workspace. |
| case_reporters | Case, authenticated reporter, submission nonce; restricted independently of case outcome and never projected to a reported person. |
| case_evidence | Case, source ID/revision, visibility scope, preservation basis, expiry, integrity digest; optional encrypted snapshot only under approved retention and access policy. |
| case_events | Immutable transition, actor, reason code, policy revision and version; no free-text evidence in audit. |
| case_notices | Recipient, approved template, outcome, appeal deadline, delivery status; no reporter, submission timestamp, quote or evidence URL. |
| case_appeals | Case, appellant, bounded private rationale, nonce, state, independent reviewer and outcome. |

Report message, profile, channel or member through a labeled dialog with category,
plain-text bounded explanation, confidentiality notice and confirmation. Validate
current visibility of the target; reject guessed/cross-tenant/private-nonmember
targets with the same unavailable response. Reporting is not permission to copy a
whole thread. Authorize evidence capture in the submission transaction and pin
its source revision. Deleted content stays a tombstone unless an independently
approved preservation policy existed; never reconstruct a body from logs.

Queue metadata is available only to scoped case reviewers, with bounded keyset
pages (proposed maximum 50) and actor/filter-bound cursors. Reporter can see their
own receipt/status; reported person can see only a separately generated outcome
and their own appeal. Reviewer conflict of interest requires reassignment; a
reviewer who is also the target cannot adjudicate. Do not expose reporter IDs in
case lists, activity, rooms, analytics, exports, notices, errors or shared links.
Reporting one’s own content is permitted; it does not create reviewer authority.
Duplicate nonce returns the same receipt; independent reports can link internally
without disclosing the number or identity of reporters to the target.

Normal source review requires current conversation membership even for owners.
Exceptional private-content review is a separate disabled capability: approved
written policy, narrow case/source scope, documented basis, two independent
approvers, recent verified step-up, short expiry, conflict checks, restricted
reviewer and content-free audit before delivery. Reauthorize on every page and
source fetch. If PAS cannot supply the required step-up or transactional audit,
keep it disabled. Notify affected users using approved wording/timing; any lawful
delay requires a recorded restricted basis and review date. Approval never joins
the reviewer to the channel or widens ordinary read/search/export endpoints.

## E13.2 — Enforcement and appeals

Case lifecycle: submitted → triaged → investigating → decided → closed. A decided
case may enter appealed → appeal_review → upheld or overturned → closed. Invalid
transitions fail without events. Use expected version and unique operation nonce;
two decisions cannot both commit. Decision, enforcement, notice outbox and audit
commit atomically. Delivery failures retry the outbox without reapplying sanctions.

| Decision | Proposed effect / reversal |
| --- | --- |
| No action | Record reason code and close; no membership or content change. |
| Tombstone | Remove ordinary body/derived mentions/search/preview; retain stable attribution and thread links. No restore unless approved evidence still exists and policy permits it. |
| Restriction | Explicit capability/scope and expiry, checked by all relevant actions; expiry/reversal removes this restriction only. |
| Mute | Personal block of notifications, distinct from a moderator-imposed posting restriction; never changes other users’ reads. |
| Suspension | Deny scoped app reads/writes/subscriptions and cancel jobs; retain historical attribution and separately approved appeal access. |
| Removal | Atomically revoke workspace/channel authority and derived access; no implicit account deletion. |
| Reinstatement | End the specified sanction after review; no automatic restoration of prior channels, deleted bodies, tokens or queued jobs. Rejoin follows E9 policy. |

Only delegated moderators with explicit tenant/sanction capability may decide;
ordinary members cannot enforce. Owner protections and transfer/last-owner checks
apply to sanctions too. Limit severity, scope and duration to approved policy;
never accept client-supplied role escalation. Expiry workers use conditional
versions and separately scoped service authority, not an unrestricted owner.

Proposed appeal defaults for review: one open appeal per decision, three submission
attempts per subject/case per 24 hours, 30-day filing window. Enforce limits server
side atomically, including concurrent requests; product/privacy must approve
values before launch. Return retry guidance without case enumeration. Appellant
must be the affected subject; suspended/removed people use a minimal authenticated
appeal endpoint independent of conversation access. An independent reviewer can
uphold or overturn; no self-review. Appeal text and attachments never reach the
reporter or ordinary audit logs. Binary evidence remains off pending E8 approval.

## E13.3 — Domain audit

Proposed append-only event envelope: event ID, workspace, authenticated actor or
scoped service identity, action enum, opaque target ID/type, server timestamp,
policy revision, operation nonce and correlation ID. Cover role/ownership,
invitation lifecycle, policy, case/enforcement/appeal, retention/hold, subject
requests/exports/downloads and security operations. Never store bodies, profile
names, emails, free-text reasons, secrets, IP-derived identifiers without approval,
signed URLs, attachment bytes, prompts or evidence snapshots. Opaque user IDs are
still personal data: approve access, retention and pseudonymization policy.

Every successful domain write and its audit/activity event share a transaction;
audit failure rolls back the domain change and derived effects. Refusals create no
success event. Retries yield one event; conflict leaves no partial sanction.
Append-only means user actions expose no update/delete audit operations; do not
claim current SQLite storage is tamper-proof. Corrections append superseding
events. Retention/purge requires separately approved worker authority and evidence.
Audit reads require explicit tenant-scoped auditor capability, bounded pages and
field allow-list, with no automatic private-channel names or reporter correlation.
Case-internal events need narrower access than the general workspace audit stream.

For external delivery, use a transactional outbox with event ID deduplication,
durable cursor, signed scoped sink, bounded retries/backoff and gap/dead-letter
alerts. Never accept arbitrary callback URLs from an ordinary client. A failed
sink does not lose committed audit; alert and pause privileged operations if the
approved backlog budget is exceeded. Security/operations must approve numeric
retention, backlog and recovery limits and prove outage/replay/tamper detection.

## E13.4 — Administration

| Surface | Authority and safeguards |
| --- | --- |
| Directory | Current workspace membership; only approved profile fields, no private participation or reporter status. |
| Roles | Owner-controlled ordinary role changes; primary transfer requires E9 recipient acceptance, step-up and conditional last-owner protection. |
| Channel policy | Scoped owner/admin policy capability; private membership still required for content; effective policy revision shown. |
| Invitations | Explicit issuer privilege ceiling; hashed secret, identity binding, expiry/revoke and approved domain allow-list; domain match never grants membership. |
| Rate-limit insights | Aggregated tenant counters and retry windows only; no message samples, identities of reporters, secrets or private-channel metadata. |
| Settings | Typed allow-list, restrictive inherited policies, expected revision, server validation and audit; reject unknown fields. |
| Destructive actions | Show exact tenant/target and consequences, accessible explicit confirmation and fresh authorization; no ambiguous global delete button. |

Confirmation tokens must be actor/action/target/revision-bound, expiring and single
use, with verified step-up where required. Client confirmation is not authority.
Concurrent policy/role changes invalidate stale confirmations. Privilege loss
between dialog and submission denies the action. Provide keyboard focus return,
field errors, non-color status, pending/empty/unavailable states and mobile layout;
never show unavailable controls as successful. No admin page should promise
unimplemented suspension, export, holds, global sessions or malware scanning.

## E13.5 — Subject requests and data lifecycle

Separate workspace departure/deactivation from PAS identity deletion. Verify the
requesting authenticated subject; support-assisted requests require approved
identity verification without collecting credentials. A workspace admin cannot
request another person’s global account deletion. Last owner must first transfer
ownership. A workspace removal already revokes app authority; it does not delete
the PAS identity or revoke browser sessions globally.

Proposed subject_requests: subject, tenant scope, type, verified basis, policy
revision, nonce, status, approvers, expiry and completion receipt. Lifecycle:
requested → verified → approved or denied → processing → completed or failed;
cancellation is allowed only before irreversible processing. Job chunks are
idempotent, versioned and auditable. Show scope, pending review and accurate
failure status; no premature completion receipt.

Export defaults to the subject’s approved personal data plus only currently
authorized conversation sources; exclude other reporters’ identities and private
case evidence. Ownership does not authorize a workspace-wide private export.
Exceptional legal exports follow a separate dual-approved scope and access path.
At each chunk and delivery recheck authority, policy and source revisions; cancel
and destroy inaccessible partial output after revocation. Require approval
separate from requester for privileged exports, immutable scope manifest and
integrity digest, private encrypted storage, short actor-bound grants, expiry,
revocation and content-free download attempt/success logs. Reauthorize on every
download; never public objects or URLs in logs. Export binaries remain blocked
until the E8 member-scoped storage contract is verified.

Deactivation blocks future app operations while preserving approved history.
Deletion proposes pseudonymized attribution and purge of approved personal fields,
with explicit treatment of messages, reactions, mentions, reports/evidence, audit,
indexes, files, caches and processors. A legal hold approved for a specific scope
wins over purge for that scope only; record a restricted deferred status, minimize
retained data and re-evaluate after release. Holds preserve data without granting
ordinary access. Hold creation versus purge must serialize or lock on the same
scope so neither silently wins a race. Explain retention exceptions in approved
user-facing wording; never expose privileged legal details to unauthorized users.

Privacy/legal must approve numeric retention, response deadlines, export grant
lifetimes, deletion SLA, appeal/evidence durations and backup expiry before work
ships. Do not invent statutory deadlines. Backups expire under approved policy;
restores stay quarantined until deletion ledger, holds and access revisions are
reapplied. Verify purge across processors and derived stores, retain content-free
completion evidence and escalate failures. Do not claim immediate deletion from
backups or deletion of copies recipients already downloaded.

## E13.6 — Operational runbooks

Common procedure: on-call acknowledges and assigns incident ID/severity, contains
scope, preserves only authorized evidence in restricted storage, records a
content-free timeline, notifies security/privacy owners, recovers under approval,
verifies denial and data integrity, communicates approved impact/status, and
records follow-up owner. Security/privacy approve severity response targets,
contacts, legal notification obligations and evidence retention before launch.
Never copy production bodies or credentials into tickets, chat or telemetry.

| Incident | Contain and investigate | Recover and verify |
| --- | --- | --- |
| Data access incident | Disable affected route/export worker; revoke app-scoped grants and derived caches; preserve metadata and approved restricted evidence. Determine tenant/source scope from audit without broad content browsing. | Fix authorization, test cross-tenant/private/removed-member denial, reconcile export/download receipts and affected processors; security/privacy approve notices and reopening. |
| Abuse wave | Apply approved per-actor/source rate limits, throttle invitation/report ingress with safe retry, triage bounded queue and quarantine suspicious artifacts. Maintain legitimate reporting/appeals. | Review false positives independently, reverse specific sanctions, verify no reporter leakage and drain queues gradually; publish approved status. |
| Account compromise | Support local sign-out on the affected browser; secure the credential/identity provider through supported recovery, rotate app integration credentials and revoke app-scoped grants. Remove/suspend app memberships under approved authority and protect last-owner recovery. Escalate to PAS support/security for identity containment. | PAS provides no app-visible global browser-session inventory or global session revocation. Do not claim local sign-out or password change ends every session. Verify app-action denial, re-establish verified identity and memberships deliberately, review privileged audit and rotate affected secrets. |
| Malware/file (future) | Keep file uploads/downloads disabled until E8 and scanner gates pass. If enabled later, quarantine object and deny grants; never open suspected payload on operator devices or forward bytes into chat. | Security approves sandbox/scanner results, revoked-download checks and scoped purge/hold behavior; restore only known-safe objects and document already downloaded copies. |
| Realtime outage | Mark live status degraded; use authorized bounded polling/durable cursors. Do not treat room silence as deletion or permission, and do not invent replay. | Reconcile canonical actions and durable changes, discard stale unauthorized responses, test membership loss during outage, restore subscriptions gradually within PAS room limits. |

## Review gates and implementation sequence

| Gate | Required evidence / approving owner |
| --- | --- |
| G1 Policy | Product + trust/privacy approve case categories, evidence access/retention, notice templates, sanctions, appeal limits and conflict rules. |
| G2 Authority | Security + E9 owner approve capability matrix, primary-owner/lifecycle/step-up contract, exceptional dual approval and authenticated restricted appeal path. |
| G3 Privacy | Privacy/legal approve subject verification, hold basis, deadlines, deletion/backup/processor policy and export authority; PAS/E8 verifies private storage. |
| G4 Operations | Operations/security approve runbook contacts/targets, scoped worker credentials, audit/outbox limits and incident/restore drills. |
| G5 Review | Independent reviewer signs off scoped schema/actions, threat model and acceptance results; accessible UI review and confidentiality probe before release. |

No gate is approved by this document. After approval, split schema/cases,
enforcement/appeals, audit/outbox, admin UI, subject jobs and runbook drills into
child issues, each with explicit dependencies and release evidence. Default off
until that child passes its gates; no PAS resources are provisioned here.

## Acceptance matrix

These are future executable gates, not claims that new services were built.
Current prerequisite SQL regressions are in qa/actions.mjs.

| ID | Scenario | Required result |
| --- | --- | --- |
| C1 | Report each target type; guessed/cross-tenant/private ID | Only currently visible canonical target accepted; indistinguishable denial. |
| C2 | Reporter/target/reviewer inspect responses, rooms, logs and exports | Reporter visible only to authorized case identity reviewers; never target. |
| C3 | Reviewer loses membership or is target; owner is private nonmember | No ordinary evidence access or self-adjudication. |
| C4 | Exceptional review lacks either approval, policy, step-up, audit or expiry | Deny; approved access narrowly scoped and audited before delivery. |
| C5 | Evidence source edited/deleted while report submitted | Revision-consistent minimal evidence or safe unavailable state; no log reconstruction. |
| E1 | Every enforcement outcome and invalid transition | Only approved scoped effect; owner protections and atomic notice/audit. |
| E2 | Concurrent decisions, same nonce, audit/outbox failure | One decision/event or full rollback; no partial enforcement. |
| E3 | Sanction expiry or overturn after another sanction | Remove only specified sanction; no resurrected channels/content/jobs. |
| E4 | Suspended/removed subject appeals; forged appellant; burst submissions | Restricted appeal works without content access; forgery/rate bypass denied. |
| E5 | Appeal reviewer is original decision maker | Reassign; no self-review; independent outcome and safe notice. |
| A1 | Send/edit/delete/profile/role/invite/policy/export events | Allow-listed metadata only; no bodies, emails, secrets, URLs or bytes. |
| A2 | Mutation fails audit; retry; attempt audit update/delete | Full rollback, one event on retry, no user audit mutation endpoint. |
| A3 | Audit sink outage, replay, cursor tampering and cross-tenant pagination | Durable scoped delivery, deduplication, alert and no tenant leak. |
| D1 | Role loss after admin confirmation; forged/replayed token | Deny with no effect/audit success; preserve safe draft. |
| D2 | Invitation domain match, last-owner change, policy conflict | No implicit membership, lockout or weakened policy. |
| P1 | Subject export includes private source, reporter or other tenant | Omit unauthorized data before materialization; no private metadata leak. |
| P2 | Authority lost mid-export/download; expired/replayed grant | Cancel/delete partials, deny download, content-free attempt log. |
| P3 | Legal hold races purge; hold released later | Atomic scope precedence, deferred receipt, approved resumption. |
| P4 | Deletion retries, processor failure and old backup restore | No duplicate job; failure stays visible; restore reconciles deletion before serving. |
| R1 | Compromise drill and customer-facing session claims | Supported local sign-out/containment/escalation only; no global revocation claim. |
| R2 | Abuse, file, data access and realtime drills | Named responders, bounded evidence, denial checks and approved recovery. |
| U1 | Keyboard, screen reader, mobile, slow/failing action | Labeled controls, explicit confirmation, safe retry, focus and accurate status. |
