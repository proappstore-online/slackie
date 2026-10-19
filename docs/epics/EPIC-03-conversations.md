# E3 — Messages, threads, and reactions

**Priority:** P0
**Depends on:** E1, E2
**Goal:** Provide durable, accessible channel conversations that recover safely.

## Tasks

- [ ] **E3.1 Define message state machine.** Plain-text/allowlisted formatting,
  length, active/edited/deleted states, author-only edit/delete authority,
  per-message ownership, and tombstones.
- [ ] **E3.2 Specify composer.** Draft, send shortcut preference, line breaks,
  mentions, safe external-link behavior, validation, retry, copy-text, and
  screen-reader states. Defer URL fetching/unfurl previews until their outbound
  privacy, permission, and abuse model is approved; shared binary attachments
  remain blocked by E8.
- [ ] **E3.3 Design idempotent send.** Client nonce, optimistic message,
  server-owned timestamp, timeout retry, and canonical replacement.
- [ ] **E3.4 Design thread experience.** Root context, reply pane, counts,
  participants, read position, edit/delete rules, and empty states.
- [ ] **E3.5 Add reactions and read cursor.** One reaction per emoji/member,
  aggregate display, per-channel read advance, and unread calculation.
- [ ] **E3.6 Specify pagination and retention.** Keyset timeline load, scroll
  anchoring, bounded history, soft-deletion tombstones, and the E9-governed
  retention/hard-purge policy.
- [ ] **E3.7 Write tests.** Include non-member message read/post, duplicate send,
  edit/delete unauthorized attempt, thread mismatch, and double reaction.
- [ ] **E3.8 Define realtime handoff boundaries.** Conversation writes remain
  canonical actions/change-feed mutations: PAS rooms are body-free, no-replay
  hints only, limited to 32 peers, 100 messages/second, and 4 KB payloads. E4/E10
  own refetch and degraded-mode behavior; message bodies and attachments never
  use a room payload.

## Acceptance criteria

- A retry cannot create two canonical messages.
- Thread replies always preserve root channel context.
- Message body is safely rendered and never returned to a non-member.
