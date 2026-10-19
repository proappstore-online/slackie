# System architecture

## Proposed PAS shape

Slackie is a multi-workspace single-page application backed by ProAppStore services;
each workspace is an isolated tenant ([ADR-005](adr/ADR-005-multi-workspace-tenancy.md)).
The browser owns presentation and optimistic interaction; authorization and every
durable state change remain server-enforced.

```text
Browser application
  ├─ PAS authentication and app-level roles
  ├─ Registered app actions ────────────────┐
  └─ declared realtime room subscriptions ─┤
                                            ▼
                                  Slackie service boundary
                                  ├─ D1: tenant-scoped relational data
  ├─ conversation change feed: durable catch-up cursor
  ├─ rooms: transient refetch hints
                                  └─ audit and moderation records
```

The eventual build should use PAS `template-workspace` as its baseline. It has
the current tenant membership, invite, audit, action and QA patterns. It must not
copy older client fan-out chat patterns with undeclared room names.

## Boundaries and responsibilities

| Boundary | Responsibility | Must not do |
| --- | --- | --- |
| Browser | Rendering, drafts, optimistic UI, reconnect/refetch | Decide authorization or durable order. |
| Registered actions | Authenticate, authorize, validate commands, transact D1 rows | Trust actor, tenant, or membership IDs from the client. |
| D1 | Canonical workspace, membership, channel, message, cursor state | Act as a websocket delivery queue. |
| Rooms | Low-latency hints to fetch an authorized change | Grant access from a predictable room name alone. |
| R2 storage | Future attachment bytes only after a member-scoped read primitive exists | Claim private-channel file sharing is safe today. |

## Auth, tenancy, and roles

Use platform-cookie identity with PAS GitHub/Google sign-in; never store a
session token. App-wide roles are not tenant permissions. Workspace RBAC lives in
D1 and is tested in every action: `owner`, `admin`, `member`, then a deliberately
specified `guest` if and when guest access is designed. A public landing and
sign-in flow can support normal invitation onboarding, while no workspace data
action is public.

A workspace is the isolation boundary. Every business row carries
`workspace_id`; every query starts with active workspace membership plus the
specific channel/DM visibility predicate.

## Realtime pattern

Rooms are declared and individually authorized. For example, `channel:*` is
permitted only by a SQL authorizer that proves active workspace membership and
either public-channel access or an explicit `conversation_members` row. The platform
rechecks socket authorization; denied access must fail closed.

D1 and actions stay authoritative. Every message, edit, delete, reaction,
membership, or archive mutation atomically records a body-free conversation
change. A client syncs changes using a durable keyset cursor; the room can only
broadcast a tiny `messages_changed` hint which prompts that sync. Clients never
trust a peer event body as a message record. Rooms offer no replay, have small
payload/peer limits, and may duplicate or miss an event.

An app worker is not an MVP dependency. If PAS later enables it for this app, it
may publish trusted system hints; it still cannot turn rooms into a durable log.

## Consistency and reliability

- Each send supplies a UUID client nonce and is idempotent for its author.
- A transaction writes the canonical change, its change-feed row, and
  mention/reaction/audit records together.
- Timeline reads use immutable keyset cursor fields, not browser time alone.
- Edits and deletes create a visible state transition; deletes are tombstones,
  not ordinary hard deletes.
- Rate limits, room outage, and network loss retain the local draft and expose
  retry/copy actions rather than silently losing authored content.

## Realtime service envelope

PAS rooms are a bounded best-effort enhancement, not a Slack-scale channel
transport: a room supports at most 32 peers, 100 messages/second, 4 KB payloads,
and no replay. Slackie must either cap active realtime viewers per conversation
or use an approved alternative transport. Over-capacity viewers get an explicit
refetch/polling degraded state; nobody is silently excluded.

## Attachment decision

PAS storage currently lacks a member-scoped shared-file-read primitive suitable
for private channels and DMs. MVP supports safe links only; Slack-style binary
attachments are an explicitly blocked future epic. Bytes must not be put in D1
or emitted in realtime room payloads.

## Delivery and observability

The future build uses additive `migrations.json`, minimal named action columns,
and versioned payloads. Release evidence includes typecheck, action-level
authorization tests, room/reconnect E2E checks, and `pas check`. Logs correlate
action, actor, workspace, target, and error class but exclude message bodies,
attachment bytes, credentials, and signed URLs.

## Reference material

- `../platform/templates/template-workspace/README.md`, `migrations.json`, and
  `mcp.json`
- `../platform/docs/adr/010-room-authorization.md`
- `../platform/docs/standard/auth.md`, `data.md`, and `ops.md`
- `../platform/docs/app-actions-security.md` and `app-workers.md`
