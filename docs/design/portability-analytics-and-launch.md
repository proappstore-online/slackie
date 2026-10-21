# Portability, analytics and launch operations (E18 / #19)

Status: design complete; review, policy and operational approval pending.
This specifies E18.1–E18.5, not a deployed importer, exporter, analytics service
or release certification. No PAS resources are provisioned. Do not split
build-ready child issues until the decision gates below have recorded approval.

## Baseline and dependencies

The current application has 47 authenticated SQL actions, explicit workspace and
channel membership, messages/threads/reactions, tombstones, and transactional
content-free audit/activity records. It has no import staging service, export
worker, historical identity mapping, analytics collector or release evidence
registry. Current retry tests protect only existing actions; they do not establish
future importer idempotency. DMs and shared binary delivery are not available.

Preserve [PAS constraints](../research-foundations.md): registered authenticated
actions for durable user operations, actor bound from `:__user_id`, additive
migrations, SQL authorization before projection, no `app.db` user path. Platform
app roles confer no workspace authority. Rooms carry ephemeral, body-free hints
only (32 peers, 100 messages/second, 4 KB); progress/recovery uses durable jobs and
authorized polling, never room replay. Private shared storage and scoped workers
must be verified with PAS before any archive can be uploaded or downloaded.
Public storage is not a fallback.

Dependencies: E9 approves identity/ownership/retention authority; E12 approves
search removal and imported-index publication; E13 approves audit, subject
requests, holds, deletion and incident policy; E8 verifies private binary delivery.
The existing server attachment mock is not proof of production capability.

## E18.1 — Export contract

Separate personal portability from privileged workspace export. An authenticated
subject can request approved personal fields and currently readable conversation
records only. A delegated workspace export capability permits approved workspace
scope but never implies private-channel or DM access, even for owners/admins.
Exceptional legal scope requires E13's independent approval, verified step-up,
restricted service path and audit; leave it disabled until those exist. Exclude
reporter identities, case evidence, secrets and other tenants in all modes.

Proposed tenant-scoped `export_jobs` bind requester, purpose enum, immutable
source-scope manifest, policy revision, source revision fence, format version,
operation nonce, state, expiry and approval references. A unique
`(workspace, requester, nonce)` returns the same job for the same request hash;
different input with that nonce is a conflict. States: requested → approved →
running → ready → expired; denied, cancelled and failed are terminal alternatives.
No download is possible before ready. Require quota reservation before running.

Format proposal `slackie-export/1`: UTF-8 JSON manifest plus bounded NDJSON parts
for approved profiles, conversations, messages and reactions. Manifest fields:
job ID, workspace ID, format/schema version, UTC generation time, explicit scope,
snapshot fence, policy/redaction revision, omitted-category reason codes, record
counts, ordered part names, byte lengths and SHA-256 digests. Digest the canonical
manifest separately in a protected receipt to detect manifest replacement;
checksums alone do not establish authenticity. Reject unknown major versions;
minor additions must preserve required fields. Timestamps retain UTC precision,
thread parent IDs and stable opaque record IDs; deleted bodies remain empty
tombstones. Never serialize credentials, signed URLs, audit free text or source
content in diagnostic fields. Attachment entries are metadata-only with an
explicit unavailable reason until E8 passes; no external URL fetching.

Capture a consistent source fence, then use bounded keyset pages (proposed 500
records / 5 MiB per part, whichever first) ordered by stable source sequence and
ID. Cursors bind job, actor, workspace, scope hash, fence and format. Without a
verified snapshot/version mechanism, fail or restart rather than promise a
consistent archive. Recheck current membership, policy, holds and tombstones at
each chunk and immediately before publishing/delivering. A revoked source or
changed redaction fence invalidates the whole partial artifact; delete it and
require a newly scoped job. Never serve stale deleted text from an earlier part.

Store encrypted private artifacts under a scoped server identity. Proposed expiry
is 24 hours with a single-use, actor/job/artifact-bound 60-second download grant;
privacy/security must approve both values. Reauthorize every download including
HEAD/range/retry; no static bypass. Record attempt, denial and completed delivery
with opaque IDs, time, outcome and byte count only. Grant consumption and audit
must precede delivery; interrupted single-use delivery needs a new authorized
grant. Revoke on membership/policy change, cancel and expiry; cleanup failures
remain restricted and alert operations. Never log tokens, URLs or archive bytes.
Explain that already downloaded copies cannot be recalled.

## E18.2 — Slack import discovery and identity

Accept an explicitly selected user-supplied archive into private quarantine,
never scrape Slack or fetch arbitrary URLs. This is a proposed supported subset,
not a claim to accept every Slack export variant. Validate version/structure with
synthetic and consented fixtures before support is advertised. Bound compressed
and expanded bytes, entry count, depth, JSON lengths and compression ratio;
reject traversal/absolute paths, symlinks, duplicate normalized paths, malformed
encoding, executable payloads and unsupported/encrypted archives. Stream bounded
parsing; do not unpack into a public directory. Scanner and storage approval are
prerequisites. Errors contain entry ordinal and reason code, never text samples.

Discovery yields counts by supported record type, unresolved references, omitted
features and attachment gaps visible only to authorized import reviewers. Private
channel names/counts never appear in general workspace analytics or logs.
Mapping preview requires explicit target workspace and channel authority; an
archive is evidence of source data, not proof of current access to its contents.
Require approved import basis and scoped reviewer approval for private sources.
DMs remain rejected until E11 supplies their authorized conversation contract.

Map source workspace, user and channel IDs using a stable source namespace plus
archive fingerprint. Display names and email addresses never join identities
automatically. Default authors to an immutable historical identity bearing an
“Imported” label; optional verified association to a live member requires their
consent and preserves provenance. Source history grants no membership, roles,
notifications, mentions or ability to act as that person. Import service identity
is the actor in audit; historical author is separate metadata, not `:__user_id`.

Preserve original source IDs, exact timestamp strings and normalized UTC order,
source revision/digest, import job and source namespace. Thread replies resolve
by source parent identity across batches; unresolved parents are quarantined with
an error, never silently attached to another message. Normalize supported reaction
codes and deduplicate source message/user/emoji tuples; unsupported/custom emoji
get a safe text label without fetching media. Missing users remain labeled
historical users; missing channels require explicit mapping or omission. Names
that collide require explicit new-channel naming or approved merge, never an
automatic overwrite. Existing live records cannot be replaced by imported IDs.
Equal source IDs with different payload digests are conflicts for review, not
last-write-wins edits. Rich content is sanitized inert text; do not execute links,
workflow triggers, bot commands, mentions or notifications on publication.

## E18.3 — Resumable, explicitly committed import

Proposed entities: tenant-scoped `import_jobs`, immutable `import_plans`,
`import_batches`, `source_record_keys`, historical identities, mapping revisions
and restricted staging records. Every staging read also checks job authority.
The immutable plan binds archive digest, source namespace, target scope, mapping
revision, parser version, quotas, supported types and omission approvals.

States: uploaded → validating → dry_run → awaiting_commit → committing →
completed. Validation/dry-run can fail or be cancelled; committing can pause on
retryable failure or enter cancelling. Dry run has no live messages, membership,
index, activity hints or notifications. Show totals, conflicts, omissions and
storage estimates with accessible progress, cancel/retry, labeled errors and
focus return. Authority loss clears sensitive preview and stops further work.
Changed mappings or archive require a new dry run and explicit confirmation.

Commit requires an actor/plan/revision-bound expiring confirmation and fresh
authorization. Proposed limits: 100 MiB compressed, 1 GiB expanded, 10,000 entries,
100,000 records/job, 200 records/batch, two concurrent jobs/workspace. These are
review candidates, not existing platform guarantees. Enforce approved quotas
atomically across jobs and reserve staging/live budget before commit. Apply
bounded retries with backoff and reason-coded failures; a worker cannot outlive
its tenant/scope grant. Credentials must not be unrestricted workspace owners.

Uniqueness key is `(workspace, source_namespace, source_type, source_id)`;
reaction identity includes source message, historical actor and normalized emoji.
Keys persist across retries and repeated uploads in the same namespace, even
after cancellation. Use transactional compare-and-set leases/expected versions.
Each batch atomically writes staged records, source-key ledger, result digest,
checkpoint and content-free audit. Lost acknowledgments replay that result;
identical keys/digests are no-ops, differing digests block as conflicts. Failed
audit or checkpoint rolls back the batch. Concurrent workers cannot both own or
commit the same batch. Retrying must not reconstruct keys from mutable names.

Stage all committed batches behind a job visibility barrier; normal reads,
search, counts, mentions and rooms exclude them until a final atomic publish.
The explicit final commit verifies source totals/digests, references, mapping and
policy revision, quotas, current scope and audit, then flips one publication
marker. This requires approved schema/query and transaction capability; do not
pretend the existing send actions provide a large-job publication barrier.
Checkpoint alone never means completed. Crash before publication leaves invisible
staging; crash after publication returns the same completion receipt on retry.

Cancel before publication atomically wins against final commit or returns
already-completed; stop workers and reconcile staging, quota and private bytes.
Retain only approved minimal idempotency receipts so a retry cannot duplicate
cancelled work. Cancellation after publication is a separate reviewed rollback
operation, not a hidden deletion of live discussion. Quarantine unresolved records;
final commit blocks until corrected or explicitly omitted in a new approved plan.
Error report includes source ordinal/opaque ID, code, stage and retryability,
restricted to reviewers; no body, query, email, path or URL in logs. Attachments
are declared unavailable, never imported publicly or silently counted as copied.

## E18.4 — Privacy-safe analytics

Analytics is optional aggregate measurement, separate from operational audit.
No client-supplied arbitrary properties, body/query capture, session replay,
keystrokes, URLs, message IDs, channel names, user emails, prompts or attachments.
Use a server-validated versioned event allow-list:

| Event | Allowed dimensions | Purpose |
| --- | --- | --- |
| workspace_created | schema version, coarse UTC day, consent revision | Eligible cohort size. |
| workspace_activated | same, product version | Workspace reaches approved activation threshold once. |
| workspace_active_week | coarse UTC week, product version | Aggregate cohort retention. |
| portability_job_finished | day, import/export enum, outcome enum, bounded size bucket | Reliability, without source identity or content. |
| experience_failure | day, route enum, approved error code, product version | Aggregate UX failure rates. |

Suggested activation definition: within seven days of creation, two consenting
human members each contribute a non-imported message. Suggested retention:
activated eligible workspaces with a non-imported human message in week N divided
by activated eligible workspaces old enough to reach week N. Exclude bots,
historical authors, dry runs, test tenants and revoked consent. Publish cohort
denominators, time windows, exclusions and instrumentation versions, never imply
missing events mean inactivity. These definitions require product/privacy review.

Deduplicate eligible facts server-side with tenant-bound rotating pseudonymous
keys; raw actor/source identifiers needed for counting stay in a restricted
short-lived aggregation layer, never dashboard dimensions. Pseudonyms remain
personal data. Proposed raw retention seven days, aggregates 90 days, minimum
cohort ten workspaces; privacy must approve values and linkage/rotation strategy.
Suppress small cells and complementary totals; prevent differencing through
repeated arbitrary filters. No per-person ranking or private-channel drill-down.

Default collection off pending approved workspace control, clear member notice
and any required individual consent. Effective opt-out wins across hierarchy;
stop ingestion, discard queued events and purge eligible raw facts according to
approved policy. Operational/security audit follows its separately disclosed E13
basis. Restrict dashboards to approved analysts, audit reads, bound exports and
retention, prohibit reuse for AI training or advertising. New event/property or
processor needs schema review, fixture-based sensitive-data probe, privacy/security
approval, documented purpose, deletion behavior and rollback flag before rollout.

## E18.5 — Beta and launch evidence

Flags are server-enforced tenant allow-lists, default off, revisioned and audited;
client flags cannot authorize actions. Separate import, export and analytics
flags; kill switches pause new work, revoke downloads and prevent publication
while preserving restricted checkpoints for approved recovery. Test flag changes
during jobs. A release register binds exact code/schema/config revisions, gate
evidence, approver, approval date and expiry; missing/stale evidence means blocked.

Feedback categories: defect, accessibility, usability, missing capability,
performance, portability integrity and privacy/security. Collect minimal consented
metadata via restricted support intake; redact pasted content, never ask for
credentials/production archives. Privacy/security reports go to restricted incident
triage. Assign severity, owner, next update and resolution evidence; use synthetic
reproductions. Publish known limitations including files, DMs and session controls.

Before beta, record actual named primary/secondary incident commander, on-call
engineer, security/privacy contact, support lead, release owner and PAS escalation
contact plus staffed hours and tested contact path. No names have been assigned
by this design. Operations proposes response/severity targets and escalation
outside coverage; approved limited coverage must be disclosed for beta. GA needs
approved continuous incident coverage, a tested rota and successful handover drill.

Proposed recovery targets for review: RPO ≤24 hours and RTO ≤8 hours for beta;
RPO ≤1 hour and RTO ≤4 hours for GA. PAS backup/restore capability must support
the approved targets before they become promises. Rehearse an isolated restore
of a known dataset plus interrupted import/export, compare record counts/digests
and measure data-loss interval and time to safe service. Restore stays quarantined
until current memberships, holds, deletion ledger, grant revocation, source-key
ledger and flags are reconciled. Confirm denied private reads and no duplicate
imports before traffic. Record actual timings, failures, owner and remediation;
a backup existing is not restore evidence. Repeat after material schema changes.

| Release | Definition of done; every item needs linked evidence |
| --- | --- |
| Beta | Approved finite workspace allow-list and capacity budget; server flag/kill-switch drill; named staffed support and incident escalation; participant consent and known-risk disclosure; authorization/accessibility/integrity acceptance results; approved recovery targets and successful isolated recovery rehearsal; reviewed beta privacy notice, terms, retention/export limitations and support docs; no unresolved critical security/data-loss blocker. |
| GA | All beta requirements revalidated for release revision; all launch-blockers closed with verification; proposed 30 consecutive days within approved availability/error/latency and quota budgets, reviewed incidents and no unexplained integrity gaps; staffed on-call rota/handover and incident drill; measured GA RPO/RTO restore; approved public privacy policy, terms, subprocessors, policy copy, status/support and user/admin docs; product, security/privacy and operations release sign-off. |

Service objectives, numeric budgets, evidence window and blocker severity need
operations/product approval. Missing observation is not sustained evidence.
Neither beta nor GA is claimed here. Rollout proceeds by approved allow-list
cohorts with stop thresholds, support capacity and a rollback owner; rollback
must preserve compatible schema and imported history. Unsupported features remain
off and user-facing copy must describe the actual available capability.

## Decision gates and build sequence

| Gate | Required decision and approving owner |
| --- | --- |
| G1 Authority/policy | Security + privacy approve export/import basis, private scope, identity mapping, redaction/holds, consent, retention, expiry and deletion; E9/E13 decisions linked. |
| G2 Platform/integrity | PAS + engineering verify scoped workers, private quarantine/delivery, quotas, snapshots, batch transactions, publication barrier and restore capability; E8/E12 dependencies resolved. |
| G3 Measurement | Product + privacy approve event schemas, activation/retention, suppression, controls, processors and numerical limits. |
| G4 Operations/legal | Named operations/support + security/privacy owners approve targets, drills, policy/terms copy, feedback handling, coverage and evidence register. |
| G5 Independent review | Independent reviewer approves threat model, schema/action design and acceptance results; accessibility reviewer approves all job/confirmation/error flows. |

No gate is approved by this document. After approval, create child issues for
export jobs/delivery, archive validation/mapping, staging/idempotency/publication,
analytics/controls and release/drill tooling, each linking its dependencies and
acceptance scenarios. Keep capabilities off until their child release gates pass.

## Future executable acceptance matrix

These scenarios specify future service tests; current prerequisite regressions
in `qa/actions.mjs` exercise actual registered SQL, not these unbuilt services.

| ID | Scenario | Required result |
| --- | --- | --- |
| X1 | Subject/admin/owner exports private nonmember, DM, other tenant or case identity | Deny or omit before materialization; no names/count leakage. |
| X2 | Revoke membership, delete source or change policy between pages and download | Invalidate artifact, deny delivery and reconcile partials. |
| X3 | Tamper cursor, part, manifest, format or snapshot fence | Reject; no mixed or unauthenticated archive. |
| X4 | Expired/replayed/wrong-actor grant; HEAD/range/static path; audit outage | Deny, no bypass or success log; no tokens/content in diagnostics. |
| I1 | Traversal, symlink, duplicate path, zip bomb, malformed/unsupported input | Bounded quarantine rejection, no public bytes or content in error. |
| I2 | Same names/emails, unknown author/channel, colliding IDs, invalid mapping | No implicit association/overwrite/membership; explicit resolution. |
| I3 | Retry batch after lost acknowledgment; concurrent workers; repeat upload | One message/reaction per stable source key and one batch result. |
| I4 | Same source key with changed content/parser/mapping | Conflict or new approved dry run; no silent overwrite. |
| I5 | Audit/checkpoint failure, crash before/after publish | Atomic batch rollback or invisible staging; one final publication. |
| I6 | Dry run, source mentions/bots/workflows, imported authors | No live effects before commit, no impersonation or triggered automation after it. |
| I7 | Cross-batch parent, missing parent/user, custom reaction, unavailable file | Preserve provenance/time/thread or explicit reviewed gap; no wrong parent/public fetch. |
| I8 | Quota race, cancel versus publish, worker lease expiry, revoked scope | Bounded work, one terminal outcome, restricted cleanup and no duplicates. |
| A1 | Inject bodies, queries, URLs, emails, arbitrary properties or unknown events | Reject at ingestion; logs and dashboards contain no payload samples. |
| A2 | Imported/bot/test activity; duplicate events; immature retention cohort | Exclude/deduplicate; correct versioned denominators. |
| A3 | Opt-out with queued facts; small cohort/complementary filters; analyst role loss | Stop/purge as approved, suppress inference and deny access. |
| L1 | Missing owner/coverage, untested recovery, unapproved policy or stale evidence | Beta/GA blocked independently; no readiness claim. |
| L2 | GA blockers open or service window/budgets not evidenced | GA blocked even if beta passed. |
| L3 | Restore pre-deletion backup and interrupted jobs; kill switch mid-job | Reconcile privacy/access/keys before serving, meet measured targets or block release. |
| U1 | Keyboard/screen reader/mobile, slow/failing jobs, authority lost in preview | Accurate progress/errors, focus recovery, safe retry/cancel and no stale sensitive UI. |
