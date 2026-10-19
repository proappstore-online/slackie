# E4 — Safe best-effort realtime

**Priority:** P0
**Depends on:** E2, E3
**Goal:** Make active conversations feel live without treating realtime rooms as data storage.

## Tasks

- [ ] **E4.1 Declare protected room patterns.** Define channel room names and SQL
  join authorizer that verifies active workspace/channel access.
- [ ] **E4.2 Define event envelope.** Keep peer event to event kind/resource ID;
  prohibit message body, attachment bytes, and authorization claims.
- [ ] **E4.3 Implement refetch reconciliation.** On hint, focus, reconnect, and
  mismatch, fetch newest authorized timeline slice with keyset cursor.
- [ ] **E4.4 Design connection states.** Connecting, live, degraded, disconnected,
  retry backoff, and accessible status copy.
- [ ] **E4.5 Load/abuse test room boundary.** Respect platform peer, rate, payload,
  and no-replay limits; ensure noisy activity does not corrupt timeline state.
- [ ] **E4.6 Decide worker use later.** Re-evaluate only if PAS enables a
  production worker; document why it is not a delivery guarantee.

## Acceptance criteria

- A non-member room join is denied and cannot reveal private channel metadata.
- A missed, duplicated, or reordered hint converges to the canonical timeline.
- The product remains usable with realtime unavailable.
