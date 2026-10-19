# E16 — Canvases, durable knowledge, and huddles

**Priority:** P2
**Depends on:** E12–E15
**Goal:** Treat document and synchronous collaboration as separate product systems.

## Tasks

- [ ] **E16.1 Decide canvas boundary.** Conversation attachment/tab model, access
  inheritance, explicit grants, document lifecycle, versioning, export, and search;
  any shared binary asset remains blocked by E8 until PAS supplies member-scoped
  private reads.
- [ ] **E16.2 Specify a small block editor.** Text, lists, checkboxes, links,
  mentions, code, conflicts, autosave, accessibility, and mobile reading/editing.
- [ ] **E16.3 Evaluate media infrastructure.** WebRTC SFU/provider, TURN/STUN,
  regions, costs, browser support, privacy terms, and feature flag. A huddle
  cannot reuse PAS rooms for media or signalling until an independently verified
  transport satisfies its peer/throughput needs; PAS rooms are capped at 32 peers,
  100 messages/second, 4 KB payloads, and no replay.
- [ ] **E16.4 Design huddle lifecycle.** Channel/DM binding, join/access,
  device preflight, audio/video/screen-share, health, moderation, and fallback.
- [ ] **E16.5 Set consent boundary.** Captions, notes, recording, transcription,
  AI summary, retention, notice, and deletion must each be approved separately.

## Acceptance criteria

- An invited huddle participant never gains underlying channel-history access.
- Recording/transcription/AI summary remain unavailable until consent and retention
  terms are accepted and technically enforceable.
