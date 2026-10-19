# Data model

## Modeling rules

- Tenant-owned rows carry `workspace_id`; all reads and writes begin with an
  active workspace membership predicate.
- IDs are opaque; client-supplied IDs/nonces are validated and idempotency-scoped.
  An ADR must select the database-generated, time-sortable canonical ID scheme
  before the first migration; a client retry nonce remains a distinct UUID.
- Persist timestamps as UTC instants. Render them with the viewer's selected or
  IANA time-zone preference; never persist a locale-formatted timestamp.
- Migrations are additive only. Ordinary deletion is a state transition, not a
  destructive database operation: messages are soft-deleted into policy-defined
  tombstones and channels are archived. Hard purge is reserved for an approved
  retention/deletion process and must preserve required audit evidence.
- Private visibility is an authorization invariant, not a UI filter.

## V1 entities

| Entity | Essential fields | Notes |
| --- | --- | --- |
| `workspaces` | id, slug, name, created_by, archived_at | Tenant boundary. |
| `workspace_members` | workspace_id, user_id, display_name, avatar_url, role, is_primary_owner, status, joined_at | Composite primary key; role is owner/admin/member/guest when defined; exactly one active member has `is_primary_owner`. |
| `workspace_invites` | id, workspace_id, role, invited_by, expires_at, accepted_at, revoked_at | Single-use and revocable. |
| `conversations` | id, workspace_id, kind, lifecycle, created_by, last_change_cursor | Chosen before migration; kind is public/private channel, DM, or group DM. |
| `conversation_members` | conversation_id, user_id, role, joined_at, left_at, history_baseline | Required for private channels and every DM. |
| `channels` | conversation_id, name, type, topic, created_by, archived_at | Channel-only discoverability metadata; unique active name per workspace. |
| `messages` | id, workspace_id, conversation_id, thread_root_id, author_id, client_nonce, body, revision, status, created_at, edited_at, deleted_at | Root is null; unique author/nonce supports retries. |
| `message_reactions` | message_id, user_id, emoji, created_at | Unique reaction triple. |
| `conversation_reads` | conversation_id, user_id, last_read_cursor, manual_unread_cursor | Timeline read state; it is not a notification queue. |
| `thread_follows` | root_message_id, user_id, muted_at, last_read_cursor | Separate thread follow and read state. |
| `activity_items` | id, workspace_id, user_id, source_id, kind, created_at, cleared_at | Durable personal attention inbox. |
| `conversation_changes` | conversation_id, cursor, resource_id, operation, revision, created_at | Body-free durable convergence feed. |
| `message_reports` | id, workspace_id, message_id, reporter_id, reason, status, reviewed_by | Confidential moderation workflow. |
| `activity_log` | id, workspace_id, actor_id, type, target_id, metadata, created_at | Immutable privileged-action record. |

DM release scope remains post-MVP, but the generic conversation/member model is
chosen before the first production migration. That keeps future DMs, group DMs,
and channels under one membership, sync, message, and notification boundary.

## Relations and invariants

```text
Workspace ──< members / invites / conversations
Conversation ── 0..1 Channel metadata
Conversation ──< members / messages / reads / changes
Message(root) ──< Message(reply via thread_root_id)
Message ──< reactions / reports
```

1. A member may discover a public channel only within their active workspace.
2. A private channel name, topic, messages, search hits, change feed, and room
   subscription require active conversation membership.
3. Workspace ownership does not automatically grant private-conversation reading.
4. A reply inherits exactly the visibility of its root channel.
5. The last active owner cannot leave, be removed, or be demoted.
6. Exactly one active workspace member is the primary owner; a conditional
   ownership transfer preserves that invariant.
7. A tombstoned message never exposes its prior body through a normal query.

## Index plan

- Membership guards: `(workspace_id, user_id, status)` and
  `(conversation_id, user_id, left_at)`.
- Timeline: `(conversation_id, thread_root_id, created_at DESC, id DESC)`.
- Thread replies: `(thread_root_id, created_at ASC, id ASC)`.
- Idempotency: unique `(author_id, client_nonce)`.
- Search is later-phase and must join eligible channel IDs before returning any
  snippet; never search globally and filter afterward.
