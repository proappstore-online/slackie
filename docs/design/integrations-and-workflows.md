# Integrations, bots, and workflows (E15 / #16)

Status: design deliverable complete; independent review and runtime implementation
pending. This proposal covers E15.1–E15.6. It does not enable integrations, select a
provider or authorize provisioning. E9 identity, E10 durable jobs/sync and E13
policy/audit are prerequisites. Build-ready child issues follow recorded review
approval, not publication of this document.

## Authority and platform boundary

Today the app has authenticated registered SQL actions, workspace and channel
memberships, messages, threads and content-free transactional audit/activity
records. It has no app registry, OAuth broker, bot principal, webhook dispatcher
or workflow worker. Never represent an installation as an owner account or pass
an installer ID as authenticated worker identity. Client actor IDs are hints;
PAS platform roles do not confer workspace roles.

Every operation must intersect current installation state and revision, explicit
scope and resource grant, effective policy, authenticated execution principal,
current workspace and channel membership, source lifecycle and action-specific
role. Delegated operations additionally intersect the current initiating user's
authority; bot operations use a separately authenticated, least-privileged bot
principal with explicit channel membership. Neither install approval nor public
channel discovery grants message access. Owners also need private membership.
Recheck before each read/write, retry and external delivery; fail closed during
authority outages. No fetch-all-then-filter or cached grant as authority.

Durable user operations must be registered authenticated SQL actions with role
checks in SQL, additive migrations, and guarded content-free audit/activity writes
in the same transaction. A worker authentication and authorization adapter is a
blocking PAS dependency: do not expose existing human actions through an admin
service credential. Existing SQL regressions prove only the human boundary.
Rooms remain body-free hints: 32 peers, 100 messages/second, 4 KB, no replay.
Use E10 durable cursors/outbox and degraded polling, never rooms as a job queue.
Shared binaries stay disabled pending E8 member-scoped private reads; neither the
attachment prototype nor a public URL resolves that dependency. PAS global
browser-session revocation and an offline conflict engine are not assumed.

## E15.1 — Registry and installation lifecycle

Proposed additive entities (not deployed schema):

| Record | Required fields and invariant |
| --- | --- |
| apps / app_versions | Publisher owner, visibility, immutable version, manifest digest, requested scopes, verified endpoints, support/security contacts; version changes never silently expand grants. |
| installations | Workspace, app version, approving actor, state, grant revision, bot principal, credential reference; unique active app/workspace binding. |
| installation_grants | Install, scope, explicit conversation allow-list, actor mode, expiry, revision; no wildcard private access. |
| app_approvals | Requester, reviewers, manifest/grant digest, decision, timestamp and reason code; consent binds the reviewed revision. |
| deliveries / workflow_runs | Workspace/install/grant revision, attributed actors, source references, idempotency key, state, attempts and deadline; no reusable bearer credentials. |

Registry visibility is private publisher draft or explicitly workspace-visible;
there is no public catalog. Only an approved workspace owner/admin capability can
approve an installation; ordinary members may request it. Show publisher identity,
requested read/write resources, external recipient, retention and ownership before
consent. Approval cannot grant access the approver lacks. Private-channel access
requires separate authorized channel invitation and explicit resource consent.
Publisher ownership transfer requires recipient acceptance, step-up, conditional
revision and audit; it never changes workspace grants automatically.

Lifecycle: requested → approved → active → disabled → uninstalled. Rejected and
expired requests cannot activate. Activation needs a reviewed immutable manifest,
valid credential and supported worker authority. Disable atomically increments
grant revision, blocks calls, cancels queued runs/deliveries and revokes tokens.
Re-enable requires fresh validation/consent and new credentials, never revival of
old jobs. Uninstall is terminal: remove secrets, subscriptions and bot membership;
retain only approved minimal attribution/audit. Reinstall receives a new ID.
Scope, endpoint, ownership or version changes requiring additional disclosure go
through review and fresh consent. Conditional revisions and unique request keys
make retries safe. Display disabled/expired/approval-needed states accessibly.

## E15.2 — OAuth and scopes

Proposed initial scopes are messages:read, messages:write, reactions:write,
commands:execute, events:subscribe and workflows:execute, each tied to explicit
conversation IDs and supported actor mode. No member/role administration, exports,
private discovery, files or arbitrary SQL scope. Reading and posting are separate;
events never imply historical read, and commands never imply ambient write.

Use authorization-code flow with PKCE S256, exact pre-registered HTTPS redirect
URI, unpredictable single-use state bound to authenticated actor/workspace and
expiry, issuer/audience checks and no open redirects. No implicit/password flow.
Code exchange is server-side, single-use and transaction-bound. Reject changed
workspace, manifest, redirect, scopes or actor between consent and exchange.
Credentials never enter browser storage, room payloads, workflow definitions,
URLs or logs. A managed secret store/encryption key owner and rotation procedure
must be approved before implementation; database rows contain opaque references.

Proposed access-token lifetime is 10 minutes; refresh credentials rotate on every
use with atomic reuse detection revoking the family. Bind tokens to installation,
principal, workspace, grant revision, audience and expiry. Each use checks live
revocation; short expiry alone is insufficient. Key rotation supports bounded
old-key verification without accepting unknown keys or algorithm substitution.
Revocation is idempotent and disables pending execution immediately. Consent UI
lists scope differences, actor mode and external disclosure; denial stores no
credential. A provider/PAS adapter, incident owner and credential deletion evidence
are release gates, not claimed platform capabilities.

## E15.3 — Bots, events and webhooks

Bots have persistent visible attribution: app, installation and, when delegated,
initiating user. They cannot impersonate a human, join private channels themselves,
invite members or edit another actor's messages. Archive, moderation, retention
and membership rules apply identically. Removing bot membership stops reads,
posts and delivery for that channel; removing the delegated initiator also stops
delegated jobs. Install-only scheduled work must declare bot mode at publication.

Inbound requests use a dedicated installation key and HMAC-SHA256 over timestamp,
delivery ID and exact raw body with an unambiguous versioned encoding. Constant-time
comparison, bounded body size, key ID allow-list and a five-minute timestamp window
precede parsing/dispatch. Persist a unique installation/delivery replay record
atomically with enqueue; acknowledge only after durable commit. Duplicate verified
requests return the same receipt without effects; reused IDs with different body
digests are rejected. Signatures establish sender identity, never action authority.

Outbound envelopes include schema version, opaque event/delivery IDs, workspace,
installation, event type, source ID/revision and occurrence time. Default payloads
are body-free; content-bearing events need explicit read scope, destination consent
and fresh authorization at dispatch. Use the same signed raw-body contract and
HTTPS. Verify endpoint ownership before activation. Reject loopback/private/link-
local/metadata addresses (IPv4 and IPv6), unsafe ports, redirects and DNS rebinding
at connection time; vetted egress proxy and network tests are required. Workflow
webhooks and unfurl fetches use this same policy. Never forward platform tokens.

Transactional outbox delivery is at least once; consumers deduplicate event IDs.
Use per-conversation revisions, tombstones and durable cursors to handle reordered
updates without resurrection. Proposed retry schedule: jittered 1s, 5s, 30s, 2m,
10m, then dead letter; honor bounded Retry-After for 429 within a one-hour deadline.
Permanent 4xx errors stop retries except 408/429; network/5xx failures retry. Store
attempt status, safe error code and timing, never response bodies or credentials.
Reauthorize every attempt; revoked or deleted sources are canceled, not retried.
Dead letters expire under approved retention; replay needs authorized operator,
current grant and explicit deduplication semantics, with an audited new attempt.

Proposed initial caps: 64 KiB inbound body, 60 inbound requests/minute/install,
120 outbound deliveries/minute/workspace, 30 bot posts/minute/channel and 10 queued
runs/install. Enforce atomically across workers with tenant fairness and bounded
queues; 429 includes safe retry delay. Final quotas, latency/error budgets and
queue retention require operations approval and measured load tests.

## E15.4 — Interactive surfaces

Slash commands resolve only within an installed workspace/conversation and show
app attribution. Actions bind an opaque one-time capability to actor, workspace,
channel, installation revision, message revision and exact action ID. Proposed
expiry: five minutes. Verify signature, audience, expiry and replay nonce, then
live authority; atomically consume nonce with durable execution enqueue. A stale
message, changed grant or another actor cannot reuse it. Deferred responses are
source-bound and reauthorized; possession of a response URL grants no access.

Private feedback is visible only to the requesting actor. Posting a result to a
channel requires separate explicit send intent and messages:write authority; do
not echo private command input publicly. Render app text inertly with accessible
labels, keyboard controls and pending/error/retry states. Cancellation, double
clicks and timeout never duplicate effects. Workspace switch, removal and sign-out
clear private state and discard late responses.

Unfurls are default off and domain-allow-listed per installation. Strip URL
credentials and fragments, never fetch private tokens or query secrets, and apply
the egress policy above. Private source previews require current source authority
for every recipient; defer any audience-wide preview when that cannot be proven.
No third-party link disclosure without explicit workspace policy/user notice.

## E15.5 — Workflow runtime

Proposed entities: workflows, immutable workflow_versions, trigger_bindings,
runs, step_attempts and idempotency_effects, all workspace/install scoped.
Lifecycle: draft → validated → published → paused → retired. Editing a published
version creates a draft; publish is conditional on expected revision and approval
of scopes, destinations and actor mode. Runs pin immutable versions and grants;
republishing never mutates an in-flight definition. A grant change cancels stale
runs rather than widening their authority.

V1 supports deliberate manual, scheduled and authorized source-event triggers;
form inputs, bounded conditions and approved HTTPS webhook/message steps. No
arbitrary code, SQL, shell, unbounded loops or dynamic credential selection.
Validate typed inputs, step count and graph acyclicity server-side. Form text is
untrusted inert data, never instructions or executable templates. Secrets are
references injected only into the approved destination at execution, not template
outputs. A form submission authorizes only its disclosed use and audience.

Manual/event delegated runs carry initiator, install, bot executor and source
provenance; effective authority is their live intersection. Scheduled work must
use explicitly consented bot mode, not a departed creator's cached identity.
Recheck authority at trigger, dequeue, each step, retry and final delivery. Source
reads cannot be relayed to recipients lacking source access; fail the step when
audience authorization cannot be established. External disclosure requires an
explicit reviewed destination grant and consent. Cross-tenant references fail.

Run states: queued → running → succeeded/failed/canceled/expired; waiting_retry
returns to running under a conditional lease. Workers claim bounded leases with
fencing generations; only the current generation may commit. Persist checkpoint,
effect key and outbox atomically. External effects are at least once; send stable
idempotency keys when the recipient supports them. Ambiguous non-idempotent timeouts
require operator reconciliation, never blind replay or an exactly-once claim.

Proposed bounds: 20 steps, 10-minute run deadline, 30-second step timeout, three
attempts with jittered backoff, two active runs/install and one per workflow.
Reserve capacity atomically; queue overflow rejects with retry guidance. Retry
only transient errors within deadline; authority/validation failures are terminal.
Cancel fences workers, revokes leases and suppresses future steps/delivery; already
completed external effects cannot be recalled. Manual retry needs current execute
authority and preserves completed-effect keys; rerunning all effects is a new
explicit run with warning and audit. No implicit compensation or hidden rollback.

Run history exposes only currently authorized safe step names/status/error codes;
no private inputs, bodies, output values or secret references. Audit includes actor,
executor, installation, workflow/version, run/step IDs, grant revision, action,
result and timestamps. All writes and audit are transactional; audit failure rolls
back enqueue/effect intent. Approval, publish, disable, cancel and retry are
attributable and rate-limited. Retention/deletion, encrypted transient step data,
backup behavior, dead-letter access and incident escalation require E13 approval.

## E15.6 — Marketplace deferred

No public catalog, self-service publisher onboarding, monetization or marketplace
badge ships here. A separate proposal must establish publisher verification,
manifest/security review, malicious update response, vulnerability reporting,
support ownership/SLOs, privacy/DPA and deletion evidence, abuse controls, billing,
refunds/tax and operational funding. Passing internal install tests does not meet
those prerequisites.

## Decision gates and implementation sequence

| Gate | Review owners | Required evidence; current state |
| --- | --- | --- |
| Authority | E9/security + PAS | Bot/service authentication, scope enforcement, revocation propagation and delegation matrix; blocked pending adapter verification. |
| Lifecycle/OAuth | Product + identity/security | Approval roles, redirect/PKCE contract, secret store, rotation/recovery drill; proposed. |
| Delivery | E10 + security/operations | Durable jobs/outbox, signing, replay and SSRF tests, numeric quotas/SLOs and on-call runbook; pending. |
| Privacy/UI | E13 + product/accessibility | External disclosure, retention/deletion, audit access, unfurl and interaction consent; pending. |
| Workflow | Security + operations | Lease fencing, idempotency/reconciliation, bounded execution and cancel/retry evidence; pending. |
| Marketplace | Product/legal/security/support | Separate prerequisites above; deferred. |

Record named reviewer, date, decision, scope and evidence links per gate; authoring
this package is not independent approval. Only then split child issues for schema
and authenticated adapters, registry/consent UI, OAuth/secrets, dispatcher and bot
actions, interactions, workflow worker/UI and failure/load tests. Each requires
negative SQL tests and sandbox integration evidence. Roll out behind server flags
with install/workspace kill switches, owned rollback and incident escalation.
No PAS resources or child issues are provisioned by this design.

## Acceptance test specification

Future tests must exercise actual registered SQL, worker/identity adapters and
controlled HTTP endpoints, not a parallel mock permission model. The new E15
regressions in qa/actions.mjs cover only existing human-action prerequisites.

| ID | Scenario | Required result |
| --- | --- | --- |
| A1 | Forged actor, other workspace/channel, public non-member, private owner non-member | No read/post or private metadata; no side effects on denial. |
| A2 | Read-only install tries post, write-only install tries read, missing resource grant | Deny despite actor membership. |
| A3 | Initiator or bot leaves, install disabled/uninstalled, policy changes between steps/retries | Cancel stale jobs and suppress delivery immediately. |
| A4 | Scope/version/endpoint change, concurrent approval, reinstall | Fresh consent, one conditional winner; old credentials/jobs stay invalid. |
| O1 | Missing/replayed state, wrong redirect/issuer, absent PKCE, swapped workspace/code | Reject exchange without storing credentials. |
| O2 | Refresh reuse, concurrent rotation, revoked/expired token, unknown signing key | Revoke family or reject; no fallback privilege. |
| B1 | Bot attempts private self-join, role change, impersonation or another user's edit | Deny; preserve explicit attribution. |
| H1 | Tampered raw body, timestamp, key, duplicate ID with changed digest | Reject before dispatch; verified retry has one durable enqueue. |
| H2 | Crash after outbox commit, duplicate/reordered delivery, deleted source | Durable recovery/deduplication; no resurrection or revoked content. |
| H3 | 429/5xx/outage, permanent 4xx, exhausted retry, dead-letter replay | Bounded backoff/deadline; safe logs and fresh authority on replay. |
| H4 | IPv6/private address, redirect, DNS rebinding, metadata URL | No private-network connection or credential forwarding. |
| H5 | Multi-worker bursts and noisy tenant | Atomic caps, bounded queues, fair progress and safe 429. |
| I1 | Expired/replayed action, different user/channel, stale message/grant | No effect; same-click retry cannot duplicate execution. |
| I2 | Private command response, unfurl of private source, sensitive URL | No unauthorized audience disclosure or implicit external fetch. |
| W1 | Concurrent publish, draft edit during run, malformed/cyclic definition | Immutable pinned version; reject invalid graph and stale publish. |
| W2 | Manual/delegated/scheduled execution with lost initiator authority | Live intersection; schedule uses explicit bot mode only. |
| W3 | Crash/lease expiry, stale worker commit, concurrent effect retry | Fenced commit, durable checkpoint and stable effect key. |
| W4 | Ambiguous external timeout without recipient idempotency | Reconcile explicitly; never blind replay or exactly-once claim. |
| W5 | Cancel races dispatch; retry completed steps; queue/deadline overflow | No subsequent effects; preserved keys, bounded work, honest completed-effects notice. |
| W6 | Secret/form injection, cross-tenant source, audience lacks source access | No executable interpolation, secret leak or unauthorized relay. |
| G1 | Audit failure, diagnostics and history inspected by unrelated actor | Transaction rollback; scoped content-free evidence only. |
| G2 | Retention expiry, uninstall and backup restore | Delete credentials/transient data per approved policy; reconcile revocations before serving. |
| U1 | Keyboard/screen reader, narrow viewport, sign-out/workspace switch with late response | Accessible consent/status and cleared private state. |

Passing today's suite does not prove OAuth, webhooks or workflow execution works.
Those features remain unavailable until review gates and implementation evidence
are complete, consistent with issue #16's design-before-implementation queue rule.
