# Data model

## Modeling rules

- Tenant-owned rows carry `workspace_id`; all reads and writes begin with an
  active workspace membership predicate.
- IDs are opaque; client-supplied IDs/nonces are validated and idempotency-scoped.
- Migrations are additive only. Ordinary deletion is a state transition, not a
  destructive database operation.
- Private visibility is an authorization invariant, not a UI filter.

## V1 entities

| Entity | Essential fields | Notes |
| --- | --- | --- |
| `workspaces` | id, slug, name, created_by, archived_at | Tenant boundary. |
| `workspace_members` | workspace_id, user_id, display_name, avatar_url, role, status, joined_at | Composite primary key; role is owner/admin/member/guest when defined. |
| `workspace_invites` | id, workspace_id, role, invited_by, expires_at, accepted_at, revoked_at | Single-use and revocable. |
| `channels` | id, workspace_id, name, type, topic, created_by, archived_at | Type is public or private; unique active name per workspace. |
| `channel_members` | channel_id, user_id, role, joined_at, left_at | Mandatory for private channels; public subscription is optional. |
| `messages` | id, workspace_id, channel_id, thread_root_id, author_id, client_nonce, body, status, created_at, edited_at, deleted_at | Root is null; unique author/nonce supports retries. |
| `message_reactions` | message_id, user_id, emoji, created_at | Unique reaction triple. |
| `channel_reads` | channel_id, user_id, last_read_message_id, last_read_at | Unread baseline. |
| `message_reports` | id, workspace_id, message_id, reporter_id, reason, status, reviewed_by | Confidential moderation workflow. |
| `activity_log` | id, workspace_id, actor_id, type, target_id, metadata, created_at | Immutable privileged-action record. |

DMs are a post-MVP decision. They should use a generic conversation/member model
or a dedicated table only after their small-group lifecycle and visibility rules
are settled; neither approach may weaken channel authorization.

## Relations and invariants

```text
Workspace ──< members / invites / channels
Channel ──< channel members / messages / reads
Message(root) ──< Message(reply via thread_root_id)
Message ──< reactions / reports
```

1. A member may discover a public channel only within their active workspace.
2. A private channel name, topic, messages, search hits, and room subscription
   require active `channel_members` membership.
3. Workspace ownership does not automatically grant private-conversation reading.
4. A reply inherits exactly the visibility of its root channel.
5. The last active owner cannot leave, be removed, or be demoted.
6. A tombstoned message never exposes its prior body through a normal query.

## Index plan

- Membership guards: `(workspace_id, user_id, status)` and
  `(channel_id, user_id, left_at)`.
- Timeline: `(channel_id, thread_root_id, created_at DESC, id DESC)`.
- Thread replies: `(thread_root_id, created_at ASC, id ASC)`.
- Idempotency: unique `(author_id, client_nonce)`.
- Search is later-phase and must join eligible channel IDs before returning any
  snippet; never search globally and filter afterward.
