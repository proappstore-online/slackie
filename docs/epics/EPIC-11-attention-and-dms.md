# E11 — Attention model, threads, and future direct messages

**Priority:** P0 attention design; P1 DM delivery
**Depends on:** E3, E10
**Goal:** Separate reading, notification, and conversation membership so attention is predictable.

## Tasks

- [ ] **E11.1 Define cursor semantics.** Timeline read cursor, manual unread marker,
  join baseline, monotonic advance, deletion effects, and multi-device behavior.
- [ ] **E11.2 Define thread state.** Follow/mute, participant default, per-thread
  read cursor, reply notification, root validation, and mobile thread experience.
- [ ] **E11.3 Design Activity.** Durable personal items for mentions, replies,
  reactions, invitations, and system events; clear state must not alter message read.
- [ ] **E11.4 Specify notification preferences.** Workspace/conversation baseline,
  mute, mentions/DM/all policy, DND/time zone, privacy-safe previews, delivery
  fallback, and future push opt-in.
- [ ] **E11.5 Finalize DM behavior before shipping it.** Canonical pair resolution,
  group-DM cap, membership changes as successor conversation, historical access,
  block/report policy, and guest rules.
- [ ] **E11.6 Add personal triage.** Later/saved state, reminder policy, source
  permalink, and personal-only visibility.
- [ ] **E11.7 Explicitly defer ephemeral presence and typing.** V1 shows no
  online/away/offline presence or typing indicator. Any later design must define
  visibility, consent, guest/blocking behavior, staleness, and battery/privacy
  impact; it must treat PAS rooms as body-free, no-replay hints capped at 32
  peers, 100 messages/second, and 4 KB, with the E10 change feed remaining
  canonical and no user-facing delivery guarantee.

## Acceptance criteria

- Clearing Activity never changes read state, and mark-read never clears an
  unrelated activity item.
- Thread notifications can differ from the parent timeline without ambiguity.
- A future DM adds members only through an explicitly chosen new-conversation rule.
