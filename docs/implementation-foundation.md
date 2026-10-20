# Foundation scaffold status

The current increment implements the explicitly requested channel-based scaffold,
not a production MVP or completion of E0/E1. The browser supports platform sign-in,
workspace creation/switching, channel metadata/archive/invitation controls,
paginated messages, editing/deletion/reactions, and workspace member profiles
and management. These paths require a configured PAS
host; no resources are provisioned and no deployment workflow is installed.

## Layout and local verification

- `mcp.json`: 40 authenticated SQL actions, including the original 19 compatible
  names, the requested channel/message/member helpers, and a room authorizer.
- `migrations.json`: workspace, membership, channel, message, reaction, and
  content-free audit tables. Migration 0005 adds archive/edit/delete fields,
  `message_reactions`, and `activity_log`, preserving earlier migrations and
  copying legacy reaction/audit data. Migration 0006 adds topics, archive time,
  member profile fields, and an audit-to-activity trigger. These migrations have
  not been applied to PAS.
- `web/`: React/Vite, platform-cookie auth, workspace/channel/message shell,
  template CSS/PWA assets. Private content stays in component memory; changing
  workspace/channel or signing out unmounts its view. Request effects ignore
  stale responses after unmount. Failed sends retain the current draft and id.
- `qa/actions.mjs`: template-derived SQLite transaction harness and positive and
  negative tests executing the registered SQL itself, including foreign keys.
- `qa/browser.spec.ts`: browser interaction coverage with mocked PAS transport,
  including modal focus, sending/retrying, edits/reactions/deletes, sign-out,
  member controls, and ten-second polling while rooms are unavailable.
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

## Remaining gates

E0 product/privacy decisions; E1/E9 invitation binding, expiry/revocation,
membership statuses, ownership transfer/step-up and governance; generic
conversations; threads; revision conflicts; durable body-free change feed and
sync; realtime authorization/capacity validation; complete attention semantics;
rate limiting; CSP/CSRF review; browser accessibility/E2E and usability evidence.

Attachments, DMs, search, guests, exceptional private
review, integrations, huddles, enterprise, and AI remain unavailable. Private
shared-file support, name/route availability, and PAS provisioning validation
remain unresolved. Retention/export/deletion policy must be decided before
customer data is accepted. No epic should be marked complete from this scaffold.
