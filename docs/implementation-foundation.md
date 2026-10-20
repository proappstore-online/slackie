# Foundation scaffold status

The current increment implements the explicitly requested channel-based scaffold,
not a production MVP or completion of E0/E1. The browser supports platform sign-in,
workspace creation/switching, channel metadata/archive/invitation controls,
paginated messages, threads/replies, editing/deletion/reactions, mentions,
workspace member profiles/management, owner-only workspace renaming, and
first-channel onboarding. These paths require a configured PAS
host; no resources are provisioned and no deployment workflow is installed.

## Layout and local verification

- `mcp.json`: 47 authenticated SQL actions, including the original 19 compatible
  names, the requested channel/message/member helpers, and a room authorizer.
- `migrations.json`: workspace, membership, channel, message, reaction, and
  content-free audit tables. Migration 0005 adds archive/edit/delete fields,
  `message_reactions`, and `activity_log`, preserving earlier migrations and
  copying legacy reaction/audit data. Migration 0006 adds topics, archive time,
  member profile fields, and an audit-to-activity trigger. These migrations have
  not been applied to PAS. Migration 0007 adds root-scoped thread replies,
  unique mention handles, and transactionally derived mention records.
- `web/`: React/Vite, platform-cookie auth, workspace/channel/message shell,
  template CSS/PWA assets. Private content stays in component memory; changing
  workspace/channel or signing out unmounts its view. Request effects ignore
  stale responses after unmount. Failed sends retain the current draft and id.
- `qa/actions.mjs`: template-derived SQLite transaction harness and positive and
  negative tests executing the registered SQL itself, including foreign keys.
- `qa/browser.spec.ts`: browser interaction coverage with mocked PAS transport,
  including modal focus, sending/retrying, edits/reactions/deletes, sign-out,
  member controls, thread retry/context/focus, mentions and independent seen
  state, owner/admin settings, onboarding, and polling while rooms are unavailable.
- `.github/workflows/`: CI tests/typecheck and template compliance; no deploy job.

Use `pnpm install`, `pnpm test`, and `pnpm build`. The build invokes the official
`@proappstore/cli` compliance check; a successful local check does not establish
hosted action acceptance or PAS capacity behavior.

Run `pnpm test:browser` after `pnpm exec playwright install chromium`, or set
`SLACKIE_BROWSER` to an installed Chrome/Edge executable. CI uses Node 24.

## Explicit scaffold choices

- Follow the latest requested channel-specific schema and action names. Existing
  design documents retain the intended generic conversation architecture and
  earlier action catalogue. Reconcile those contracts before a production
  migration; this scaffold does not supersede that architecture.
- Workspace creation bootstraps an owner atomically. A unique partial index
  prevents multiple owners. No registered action removes/demotes the owner or
  grants a second owner. Secure ownership transfer remains unimplemented.
- Owner/admin can add ordinary members directly by platform user id for this
  scaffold. Only the owner can grant admin or update ordinary roles; admins
  cannot remove peers or owners. This is not the secure invitation lifecycle.
- Private metadata and content require channel membership even for privileged
  workspace roles. Privileged actors outside a private channel cannot add
  themselves to it. Only owner/admin can create channels, per the latest request;
  creation joins its creator atomically. Archived channels preserve authorized
  readable history and refuse joins, sends, edits, and new reactions.
- Channel members can invite existing workspace members, including to private
  channels. Admins/owners outside a private channel cannot invite themselves.
  General and the caller's last joined channel cannot be left, enforced in SQL.
- Per the latest scaffold request, channel-member admins/owners may tombstone
  others' messages. E3 records this updated implementation policy, preserving
  the channel membership requirement. Deleted bodies are erased from the current row;
  `deleted_at` records server time and the timeline omits deleted messages as
  requested. This differs from the earlier visible-tombstone design.
- Client-chosen message ids are stable retry keys, with database uniqueness;
  sends return batch mutation counts, not a canonical message response. Fetch
  through `get_messages`; the UI confirms its send id in that response.
  Canonical ID generation and a direct canonical send response remain gates.
- Edits are author-only within 24 hours, enforced by server time. Sender names
  come from tenant-scoped profiles, falling back to a safe historical label.
  Reactions are unique per message/user/emoji and grouped with a caller flag.
- `channel_mark_read` uses server time and monotonic guards, not a conversation
  change cursor. Messages use timestamp/id keyset ordering resolved from a
  channel-scoped `before_id`. `get_messages` always returns at most 50 rows;
  the legacy `message_list` permits a bounded 1..100 limit.
  These are preliminary contracts, not E10/E11 completion.
- Every mutation ends in a body-free `audit_log` insert gated on `changes()` and
  actor membership. A same-transaction trigger mirrors it to `activity_log`, so
  an audit/activity failure rolls back the mutation. No message body is logged.
- Tenant keys and composite foreign keys protect scoped joins. Workspace-member
  deletion cascades channel membership; historical messages/reactions remain.

## Realtime and platform boundaries

Rooms are declared as `channel:*`, with ids
`channel:{workspace_id_codepoint_length}:{workspace_id}/{channel_id}`. The length
qualifier prevents delimiter collisions between workspace/channel id pairs.
`can_join_channel` validates the complete room/key pair and active workspace and
channel membership in SQL. Only body-free `messages_changed` hints are sent;
incoming events only trigger authorized reads. Hints, focus, reconnect, and a
ten-second interval refetch the currently loaded message window. At capacity or
outage, polling remains available and posting does not depend on room delivery.
No durable change-feed cursor or replay guarantee is implemented; this does not
complete E10 or the full E4 acceptance criteria.

The inspected PAS binder (`platform/packages/backend/src/lib/action-sql.ts`)
injects `:__user_id`, `:__now`, and `:__uuid`, not `:__workspace_id`. Workspace ids
are ordinary validated action inputs, checked against SQL membership. Room
authorizers receive `room` and `key`; the platform has no app-tenant model.
The platform ADR-010 describes periodic socket reauthorization (up to one minute),
not atomic socket eviction. Action reads immediately recheck membership, and
rooms contain no message content. Hosted capacity/revocation must still be tested.

Canonical epic E4/#6 is realtime. Workspace member work belongs to E1/#7 and
E9/#8. E0 has unresolved product/privacy/ADR tasks and is not complete merely
because a foundation increment landed.

## Threads, mentions, settings, and onboarding

- `messages.parent_id` references a root message. Both action predicates and
  a schema trigger require the same workspace/channel, a non-reply root, and a
  live parent when inserting a reply. Roots and replies use separate bounded
  keyset queries. Reply counts exclude deleted replies. Authorized readers can
  still read replies to a deleted root, with a body-free parent tombstone, but
  cannot add replies to it. Replies use stable retry ids, ordinary author edit
  rules, and existing channel authorization. No nested threads are exposed.
- Canonical `mention_handle` values are unique per workspace. Existing/new
  members get collision-free `uid-` plus UTF-8-hex user-id fallback handles; a member
  can choose a 1..32-character lowercase ASCII letter/number/underscore/hyphen
  handle in their profile. The `uid-` prefix is reserved so a chosen handle cannot
  block a future member's generated handle. Display names do not determine mention identity.
- SQL triggers tokenize plain-text `@handle` references on message/reply insert
  and body edits. Matching is case-insensitive and uses ASCII token boundaries;
  repeated references deduplicate, email fragments and longer handle prefixes
  do not match, and self mentions are ignored. There is no client-supplied
  recipient list. A recipient must currently belong to both workspace and channel,
  including private channels. Mentions carry only resource ids and attention state.
- Existing messages are not backfilled. Edits remove stale recipients, preserve
  seen state for retained recipients, and add newly mentioned recipients. A handle
  change does not rewrite old attention items; a later body edit re-resolves text.
  Deletion removes that message's mentions. Channel/workspace removal revokes
  reads and cascades attention items; rejoining does not resurrect old mentions.
- `list_mentions` uses 50-row keyset pages with authorization at read time.
  `get_mention_count` counts all currently eligible unseen items, beyond the page.
  `acknowledge_mention` is recipient-only and changes no channel/thread read cursor.
  Message, derived mentions, and audit are atomic. These items are a minimal
  personal mentions inbox, not a full Activity/notification delivery system.
- Room hints remain body-free and trigger authorized attention refetches while
  viewing a channel. Ten-second polling refreshes mentions regardless of rooms.
  No push, email, or global notification-delivery guarantee is added.
- `update_workspace` checks owner role in SQL. Admins see read-only name settings;
  ordinary role management retains owner protection. Ownership transfer and the
  full E9 governance lifecycle are still separate work.
- First-run owners/admins get a create-first-channel prompt with `general`
  prefilled. Ordinary members get guidance without unauthorized creation controls.
  General's welcome is a UI hint, not a duplicate-prone system-message write.
  The PAS pending/signed-out/signed-in state boundary remains unchanged.

The request's filenames `EPIC-05-threads.md`, `EPIC-06-notifications.md`,
`EPIC-10-admin.md`, and `EPIC-11-onboarding.md` do not exist. Canonical threads
belong to E3/E11; E5 is trust/quality, E6 validation, E9 identity/governance,
E10 durable sync, E11 attention, and E12 search. The requested feature increment
does not close those broader epics or replace their acceptance criteria.

## Remaining gates

### Acceptance review — 2026-10-20

The final local review passed typecheck, 499 SQL assertions across 47 registered
actions, and 12 browser scenarios with mocked PAS transport. `pnpm test` runs
typecheck/SQL; `pnpm test:browser` runs the browser suite separately. Passing these
checks does not complete all canonical epic tasks or establish hosted readiness.
All ten issues below remain open; none qualifies for an unconditional
"all MVP acceptance criteria implemented" closure comment on this evidence.

| Issue | Canonical epic | Remaining work preventing full closure |
| --- | --- | --- |
| #1 | E0 Foundation | Product differentiation, role/privacy ratification, journey evidence, canonical ID and retention/purge decisions. |
| #7 | E1 Workspaces | Secure invitation lifecycle, membership statuses/leave, ownership transfer, and the E9 governance gate. |
| #5 | E2 Channels | Private-channel member removal/recovery, retained-content policy, and hosted authorization evidence. |
| #2 | E3 Conversations | Thread follow/read state, optimistic/canonical send reconciliation, retention policy, and durable change-feed handoff. |
| #6 | E4 Realtime | Hosted join/revocation and capacity/load/abuse validation, plus the E10 convergence contract. |
| #3 | E5 Trust/quality | Confidential reports/moderation, abuse/rate controls, full accessibility evidence, and security/supply-chain release gates. |
| #4 | E6 Validation | Five target-team usability sessions, findings disposition, instrumentation, and release/runbook review. |
| #8 | E9 Identity/governance | Accepted/step-up ownership transfer, full membership lifecycle, hashed/bound expiring/revocable invites, and retention/export/deletion policy. |
| #12 | E10 Durable sync | Atomic body-free change feed, durable cursors/expiry, revision conflict rules, service envelope, and chaos/multi-device evidence. |
| #10 | E11 Attention | Monotonic/manual-unread and thread read/follow/mute semantics, full Activity and notification preferences, plus E10 integration. |

Owner/admin/member SQL checks, owner protection, and private-channel isolation
are implemented and tested. They are only part of #8: refusing owner removal is
not an ownership-transfer lifecycle, and direct member insertion is not secure
invitation acceptance. Guests remain disabled under the adopted MVP scope;
this review does not introduce guest, DM, or search implementation requirements.

Key build decisions are recorded above and in `docs/adr/`. There is no
`docs/decisions/` directory. No deployment/provisioning is authorized by this review.

E0 product/privacy decisions; E1/E9 invitation binding, expiry/revocation,
membership statuses, ownership transfer/step-up and governance; generic
conversations; thread follow/mute/read cursors; revision conflicts; durable body-free change feed and
sync; realtime authorization/capacity validation; complete attention semantics;
rate limiting; CSP/CSRF review; browser accessibility/E2E and usability evidence.

Attachments, DMs, search, guests, exceptional private
review, integrations, huddles, enterprise, and AI remain unavailable. Private
shared-file support, name/route availability, and PAS provisioning validation
remain unresolved. Retention/export/deletion policy must be decided before
customer data is accepted. No epic should be marked complete from this scaffold.
