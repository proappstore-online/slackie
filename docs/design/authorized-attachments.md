# Authorized shared attachments proposal (E8 / #13)

Status: proposed; product implementation blocked. This is a design and validation
package, not evidence of PAS capability, completed sandbox tests, or approval.
No resources, actions, migrations, upload UI, or child issues are provisioned.
ADR-004 remains in force: safe external links only until the gates below close.

## E8.1 Required platform contract and evidence

PAS must document and independently demonstrate private shared-object reads
whose authority is evaluated on every request against the parent message's
current workspace and conversation membership. Existing message reads require
both workspace and channel membership, including for public channels; owners
and admins have no private-channel bypass. Future DM access must use E11's
approved predicate, not a channel-membership approximation. Unsupported guest
and DM identities fail closed until their owning epics define the predicates.

The following operations are requirements, not claims about existing PAS APIs:

| Operation | Required contract |
| --- | --- |
| Begin upload | Authenticate sender; check posting permission; reserve bounded quota; issue an opaque, expiring, write-only capability for one private staging object |
| Complete upload | Verify actual size, MIME signature, checksum and scan outcome; bind immutable object version to sender, workspace, conversation and intended message nonce |
| Publish message | Recheck current posting authority and atomically publish message plus clean attachment metadata; retry with the same nonce returns the same result |
| Read/preview/range | Authenticate and recheck canonical parent visibility and live membership before every response, including conditional/range requests and derivatives |
| Revoke/delete | Deny new reads immediately on membership loss, message deletion or retention expiry; durably retry physical deletion of original and derivatives |

The platform must explain how authorization and byte delivery share a consistent
revocation boundary. A membership snapshot at upload time is insufficient.
No reusable bearer download URLs, public objects, client storage credentials,
or CDN cache that bypasses current authorization are acceptable. Object IDs
are identifiers only. Redirect targets must preserve the same checks. Revocation
cannot retract bytes already downloaded; define and test what happens to an
in-flight stream when membership changes before claiming stream cancellation.

Gate evidence must record PAS documentation/version, sandbox identity/environment,
reviewer/date, exact API operations, sanitized request/response assertions,
authorization/stream/cache behavior, and results for every case below. Use two
workspaces, a private channel, an owner outside that channel, a sender, a reader,
and an outsider. No tokens, URLs, filenames or bytes in committed evidence.
An approved sandbox and documented primitive are prerequisites to executing this
plan. Neither is supplied by issue #13; E8.1 remains open.

## E8.2 Proposed file policy

For review: initially allow PNG, JPEG, PDF and plain UTF-8 text; maximum 10 MiB
per file, four files per message, and 1 GiB per workspace including staging and
derivatives. Enforce limits server-side on actual bytes and reserve quota
atomically; reject excess with a bounded retry response. These are proposed
limits, not platform guarantees. Reject executable, archive, SVG/HTML and
MIME/signature mismatches; sanitize display names and download headers.

Quarantine all uploads until an approved malware scanner succeeds. Scanner
failure, timeout or unsupported type keeps the object unreadable; never publish
an unscanned file. Generate only bounded raster previews in an isolated worker
with resource limits, remove image metadata, and apply identical authorization
to thumbnails. Disable PDF/text inline execution and automatic URL unfurls;
external links stay user-opened and no server-side URL fetch is introduced.

Deleted or expired parents immediately hide originals and previews. A durable
cleanup job retries byte deletion and reconciles quota; expired staging objects
are swept within a proposed 24 hours. E9 must approve retention and backup
expiry before launch. No legal-hold, export or eDiscovery promise is made.
Reports reference an attachment ID; a report does not give admins read access.
Any exceptional evidence access, preservation or legal hold requires the E13/E17
authority and audit policy before implementation, without silently extending
retention. Audit only operation/outcome and approved opaque identifiers; omit
names, bytes, hashes, credentials and signed URLs from diagnostics and rooms.

## E8.3 Upload lifecycle and transaction boundary

Use private states `staging -> scanning -> ready -> published`, with rejected,
expired and deleted terminal states. Only published objects with a live parent
can be read. Sender-bound capability expiry is proposed at five minutes; retries
must not extend it or change its workspace/conversation/message binding.
Check membership when starting, completing and publishing, including when a
member leaves during scanning. Archived conversations reject new publication.

Store metadata only in authorized SQL; never binary data in D1 or room payloads.
The final message action must atomically claim ready attachments owned by the
sender and scoped to that exact conversation, insert message/attachment links,
and write content-free audit/activity rows. Prevent reuse with another message,
cross-workspace IDs and concurrent double claims. A failed final transaction
leaves no visible attachment or partial message.

Object storage and SQL are not assumed to share a transaction: keep staged bytes
private until the canonical publication record authorizes reading. An expired
or abandoned upload is collected through an idempotent reconciliation process;
publication failure cannot make staged bytes readable. Approve this protocol
with PAS before creating build-ready implementation tasks.

## E8.4 Retrieval and client behavior

Resolve attachment -> canonical parent -> current membership in a trusted
authorized operation. Require a published clean object, nondeleted/unexpired
parent and identical workspace/conversation bindings. Evaluate reply/root
visibility under the canonical message policy without recovering deleted text.
Return the same generic unavailable response for forbidden and nonexistent IDs,
without filenames, dimensions, content length or other existence hints.

Every original, preview, HEAD, conditional and range path uses this predicate.
Use private no-store responses, prohibit service-worker/browser persistence and
unauthorized cache hits, and require fresh checks on retries. Clear mounted
metadata/previews on identity/workspace change, sign-out, refusal and failed
refresh; discard late responses from an old identity. Rooms carry only approved
body-free change hints. Search must not index attachment bytes, extracted text,
names or URLs until E12 separately approves an authorized indexing contract.

## E8.5 Required executable acceptance tests

These are test specifications, not passing executable coverage. Once PAS is
approved, extend `qa/actions.mjs` against the exact registered actions, add
sandbox storage integration tests and browser tests in `qa/browser.spec.ts`.
A mocked membership model alone cannot establish private-byte revocation.

| Scenario | Required assertion |
| --- | --- |
| Anonymous, outsider, foreign workspace, owner outside private channel | No bytes or metadata from any upload/read/preview/HEAD/range route |
| Workspace member outside public channel | No attachment read until current message membership allows it |
| Reader removed from channel or workspace after successful read | Reuse the exact previous request, identifier and any issued URL; original, preview, range and conditional requests all deny |
| Removal during staging, scan or publish; archived conversation | Publication denied with no visible partial message |
| Wrong sender/conversation/message nonce, expired capability, replay | No cross-scope publication, overwrite, quota duplication or second claim |
| Concurrent finalization and injected transaction failure | One canonical publication or complete rollback, including audit/activity |
| Oversize stream, mismatched MIME, malware, scanner outage | Private quarantine/rejection; no readable original or derivative |
| Parent delete, expiry and hard purge | Immediate read denial; cleanup retries remove all versions/derivatives without restoring authority |
| CDN, redirects, HEAD, 304 and range; stale preview URL | No authorization bypass, private metadata or cached bytes after removal |
| Guessed IDs and absent objects | Same unavailable status/body and no identifying response headers |
| Workspace switch/sign-out with preview request in flight | Late result discarded; no retained browser/service-worker cache |
| Inspect logs, errors, rooms, search, analytics and browser storage | No binary content, extracted text, names, tokens or download URLs |
| Interrupted sweep, scanner retry and quota reservation race | Bounded storage, idempotent cleanup, no premature read access |
| In-flight stream during removal | Observed behavior matches the approved platform revocation contract |

## Decision gates and operating review

The value case is sharing private discussion evidence with the same audience as
its message. Principal threats are IDOR, stale bearer URLs/caches, confused-deputy
publication, malicious files and quota exhaustion. The controls and tests above
must be reviewed together; hiding an upload button is not a security boundary.

Storage, scan, preview CPU and egress costs grow independently of message count.
Before release approve a measured per-workspace budget, rate limits, scanner
timeout/retry envelope, cleanup alerts and an operator runbook. Monitor aggregate
bytes reserved/stored, scan latency/failures and deletion lag without content.
Scanner/storage failure disables new publication; authorization uncertainty denies
reads. Never degrade to public URLs. A kill switch stops new uploads while
preserving authorized reads and deletion, unless read authorization itself fails.

| Gate | Current evidence / disposition |
| --- | --- |
| Verified membership-scoped PAS primitive (E8.1) | Missing; blocked, no sandbox execution claimed |
| File policy and upload/read protocol review (E8.2–E8.4) | Proposed here; review pending |
| Revocation and leak tests (E8.5) | Specified above; execution blocked on primitive |
| Retention, DM/guest, moderation and operating decisions | Owning epic/platform approval required for the intended launch scope |
| Build-ready child issues and product implementation | Only after documented gate decisions; no approval inferred from this design |

Record reviewer, date, evidence and approved scope when closing each gate.
Issue #13 remains open until its verified-platform acceptance criterion and
required review/testing are satisfied. Safe external links remain the only
supported sharing scope in the meantime.
