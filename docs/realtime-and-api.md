# Realtime and API contract

## Rule: actions are authoritative

All durable writes are registered, authenticated app actions. Each action verifies
workspace membership, role, channel visibility, lifecycle state, request shape,
and rate-limit outcome before it reads or mutates data. Actions return named,
minimal columns and bounded pagination—never a broad `SELECT *`.

## Initial action catalogue

| Area | Actions |
| --- | --- |
| Workspace | `create_workspace`, `list_my_workspaces`, `get_workspace`, `list_members` |
| Invitations | `create_invite`, `accept_invite`, `revoke_invite`, `change_member_role`, `remove_member`, `leave_workspace` |
| Channels | `create_channel`, `list_channels`, `get_channel`, `join_channel`, `leave_channel`, `rename_channel`, `archive_channel` |
| Messages | `list_messages`, `get_thread`, `send_message`, `edit_own_message`, `delete_own_message`, `get_permalink_target` |
| Sync and attention | `sync_conversation_changes`, `mark_conversation_read`, `set_thread_follow`, `list_activity`, `clear_activity` |
| Participation | `add_reaction`, `remove_reaction`, `report_message`, `list_reports`, `resolve_report` |

A command owns the server time and actor identity. `send_message` accepts a
client UUID nonce, inserts once, and returns the canonical message. Invitation
acceptance and last-owner protection occur in the same conditional batch as the
state change.

## Room contract

Declared room pattern: `channel:*`, authorized by `can_join_channel`. The
authorizer proves active workspace membership and public-channel access or an
active channel membership row. Private names must not be inferable through failed
joins.

Room payloads are small, body-free hints such as:

```json
{ "type": "messages_changed", "channelId": "ch_123" }
```

After receiving a hint, the client calls `sync_conversation_changes` with a
durable keyset cursor. On room disconnect, focus, or missed update it does the
same. A sync result references canonical resources to fetch; it does not expose
message bodies to an unauthorized client. Room events have no replay guarantee
and are not a message-delivery promise.

## Timeline behavior

1. The client preserves a local draft and renders an optimistic pending row.
2. It calls `send_message` with the stable nonce.
3. Action success replaces it with the canonical record; timeout retry reuses the
   nonce.
4. Peers sync authorized body-free changes following their newest cursor, then
   fetch changed resources by ID.
5. Editing/deleting produces a fresh canonical state; clients do not trust stale
   cached body content.

## Deferred APIs

Direct messages, search, notifications, storage-backed attachments, integrations,
and worker-published trusted events are individually designed and added only when
their platform capability and permission rules are verified. The initial generic
conversation abstraction is nonetheless chosen before production migration.
