# E10 — Durable sync, scale, and online-only recovery

**Priority:** P0
**Depends on:** E3, E4
**Goal:** Make canonical conversation state converge under loss, reconnect, and room limits.

## Tasks

- [ ] **E10.1 Design conversation change feed.** Atomically append body-free rows
  for message, revision, delete, reaction, membership, and archive mutations.
- [ ] **E10.2 Define sync cursor and retention.** Keyset cursor, expiry/full
  refresh behavior, authorization at sync time, and no-change response.
- [ ] **E10.3 Define conflict contract.** Revision/expected-revision edit results,
  edit/delete/reaction races, named stale-state outcomes, and retry behavior.
- [ ] **E10.4 State online-only boundary.** Draft retention, disconnected UI,
  idempotent retry, no offline conflict-resolution promise, and sign-out purge.
- [ ] **E10.5 Publish service envelope.** Workspace/channel/message limits,
  PAS's 32-active-peer, 100-messages/second, and 4-KB room boundary, rate limits,
  no-replay room-as-hint behavior, body-free change feed, over-capacity
  polling/refetch UX, SLOs, telemetry, and support state.
- [ ] **E10.6 Add chaos/multi-device suite.** Missed/duplicate/out-of-order hints,
  removal during socket use, old-message edits, room outage, and client recovery.

## Acceptance criteria

- Old-message changes converge without full-history reload.
- Change records contain no message body or authorization claim.
- No removed member can fetch either pre- or post-removal changes.
- Over-capacity active viewers get a visible degraded mode rather than exclusion.
