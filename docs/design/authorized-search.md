# Authorized search proposal (E12 / #9)

Status: proposed, awaiting review. This document does not authorize provisioning
or close the epic's decision gates. No search action or schema is shipped yet.

## Current constraints and review gates

The registered `get_messages`, `list_thread`, and `list_mentions` actions require
both workspace and channel membership. `get_channels` allows public-channel
discovery without joining, but that does not grant message retrieval. Owners
have no private-channel bypass. Preserve these rules in every search path.
The schema currently has owner/admin/member roles, no guests, no retention
policy, and no durable recovery feed. E9 guest/retention and E10 recovery
contracts remain open. Review this proposal against E2/E3/E9/E10 before creating
build-ready child issues, as required by #9.

Required decisions: approve the FTS5 capability and migration strategy on PAS;
approve the grammar and chronology-first relevance baseline below; approve
retention and guest boundaries through E9; agree cache invalidation and recovery
through E10. Record reviewer, date, decision, and any amendments here. None of
these approvals is inferred from this proposal or from local SQLite support.

## E12.1 Index lifecycle

Propose a private SQLite FTS5 index containing only message id and current body.
Use a normal content-bearing FTS table, not an external-content index with
unmanaged deletion commands. Never expose it as a generic query action. Index
insert, replacement on edit, and removal on deletion/purge must be explicit
statements in the canonical authenticated action transaction, together with
body-free audit/activity writes. Any failure rolls back the entire batch.
Backfill only canonical, nondeleted, unexpired messages. No client index.

Every hit must join canonical messages, channels, current workspace membership,
and current channel membership using workspace/channel/message scope. Apply
these predicates before snippets, counts, suggestions, and pagination. Do not
return index bodies directly: generate snippets from the authorized current
canonical body, and require it still matches the query. This also prevents a
stale index from exposing an edited body. No global query followed by client
filtering; no facet counts or ranking statistics derived from inaccessible hits.

Archive preserves authorized searchable history, matching E2. Membership loss
revokes search immediately through live SQL joins, without waiting for index
cleanup. Membership rows are authority, never index snapshots. Suspension,
guest expiry, and retention predicates must be added when E9 defines them;
unsupported guest identities fail closed rather than becoming ordinary members.

## E12.2 Grammar and bounds

Propose 1–256 Unicode characters, at most 16 terms, AND semantics for words and
quoted phrases, with case-insensitive Unicode tokenization approved alongside
FTS capability. Quotes group a phrase; no escape syntax in the first version.
Filters: `in:<channel-id>`, `from:<user-id>`, `after:YYYY-MM-DD`,
`before:YYYY-MM-DD`, and `thread:<root-message-id>`, each at most once. Dates
are UTC midnight, after inclusive and before exclusive. Reject invalid calendar
dates, contradictory ranges, unknown filters, empty quotes, unmatched quotes,
unsupported operators, and excess terms. Filter-only queries are allowed;
empty queries show guidance without fetching history.

The client parser provides feedback, but the registered action validates the
bounded structured input again. Never accept raw SQL or raw FTS syntax. Compile
literal tokens to bound, quoted FTS terms with an approved server-side mechanism;
if PAS cannot supply this safely, keep the feature blocked. IDs and dates are
bound values. Invisible and nonexistent filter targets produce the same empty
result, without resolving names. Channel/person pickers supply authorized IDs.

Return at most 50 hits ordered by `(created_at DESC, id DESC)`. Use an exclusive
keyset cursor containing only timestamp/id, bound to the same normalized query
and workspace by a server-validated contract. Invalid, foreign, or changed-query
cursors reset with a generic invalid-cursor result containing no target data.
No total-hit count. Start with chronological relevance; evaluate a fixed corpus
for exact phrase, repeated words, accents, punctuation, and mixed languages
before accepting tokenization. Do not use global FTS relevance statistics.

## E12.3 Removal and recovery

Edit replaces the old index body atomically; delete/tombstone and retention
expiry remove it atomically, including replies independently of their root.
A deleted root's text never appears as reply context. Hard purge includes index
rows. No index copy in exports, query logs, browser persistence, or service-worker
caches. E9 must define backup expiry; no claim of instantaneous backup erasure.
Rebuild from authorized canonical storage in an approved maintenance operation,
never through a user-facing unscoped action. Keep search unavailable while a
rebuild is incomplete; validate parity and deletion fixtures before activation.
Recovery must never restore expired/deleted text from an older index snapshot.

## E12.4 Results and context

Show channel, author, timestamp, a plain-text snippet of at most 240 characters,
and literal matched spans rendered as React text/mark nodes, never HTML from
FTS. Fetch at most five preceding and five following authorized messages on open;
use a dedicated scoped context action rather than loading all history. Replies
open their root/thread. Reauthorize the target, root, and context on every open.
Unknown, deleted, expired, and forbidden links all say “Message unavailable”
and return no channel name, author, excerpt, or existence hint.

Keep query, cursor, and results only in mounted memory. Clear on workspace or
identity change, sign-out, access refusal, refresh failure, and offline state;
invalidate outstanding requests so late responses cannot repopulate cleared data.
On focus/reconnect or an E10 body-free change, clear old snippets before refetch.
Do not offer copy/export of cached results. Server revocation is immediate on
the next request; already displayed text cannot be remotely erased instantly.
E10 must approve the refresh envelope before promising live on-screen removal.
Pagination may omit concurrent inserts until refresh but must not duplicate hits.

## E12.5 Discovery

Use separate authenticated bounded suggestions (maximum 20; input 1–80
characters). Public channel names may be discovered within the active workspace;
private names require channel membership, even for owners. Message search still
requires joining public channels. People discovery uses current workspace
members and E9 profile privacy policy, with no cross-workspace identities.
Do not infer people from inaccessible message authors. Guests remain unsupported
until E9 supplies an allow-list and expiry model; then restrict both people and
channel suggestions to that explicit scope. Never autocomplete message bodies.

## E12.6 Privacy and validation

Do not log queries, tokens, bodies, snippets, result IDs, or filter values in
client analytics, action diagnostics, URLs, audit records, or room payloads.
Review platform request/error logging before enabling search. Aggregate latency,
error class, and bounded result-size metrics require no query content.

The build must extend `qa/actions.mjs` against the exact registered SQL and add
browser tests; a duplicated in-memory authorization model is not sufficient.
These are required acceptance cases, not claims of executable search coverage:

| Test | Expected result |
| --- | --- |
| Anonymous caller on every search/context/suggestion action | Authentication failure |
| Outsider or other workspace with known private text/IDs | No hits, metadata, counts, or suggestions |
| Owner/admin outside private channel | Same empty response as nonexistent channel |
| Workspace member outside public channel | Channel discovery only; no message hits/context |
| Leave channel or remove workspace membership between pages | Historical hits and context denied immediately |
| Edit unique secret to different text | Old token has no hit or snippet; new text matches |
| Delete root/reply; retention expiry; hard purge | No removed text in hits, context, suggestions, or exports |
| Archive channel with retained membership | History still searchable; posting stays refused |
| Wrong-channel thread/root/filter/cursor and guessed IDs | No existence or private metadata leak |
| Invalid syntax, oversized query, malformed dates, FTS operators | Bounded safe validation; no raw query in errors |
| SQL metacharacters, HTML, Unicode and literal wildcards | Bound literal matching and escaped text rendering |
| Equal timestamps, multiple pages, concurrent insertion | Stable exclusive order, no duplicates |
| Inject index-write failure during send/edit/delete | Canonical body, index and audit all roll back |
| Rebuild after edits/deletes and simulated interruption | Unavailable until parity; deleted text never restored |
| Workspace switch/sign-out/removal with request in flight | No stale result repopulation |
| Focus/offline/error recovery and deleted deep link | Clear cached excerpts; generic unavailable fallback |
| Guest/expired guest once E9 is implemented | Only explicit allow-list; expired identity denied |
| Inspect analytics, errors, storage and room events | No queries, bodies, snippets or private result IDs |

Implementation cannot be marked complete until these tests execute against the
approved implementation and the review gates above have recorded decisions.
