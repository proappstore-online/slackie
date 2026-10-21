# E16 — Canvases, durable knowledge, and huddles

**Priority:** P2
**Depends on:** E12–E15
**Goal:** Treat document and synchronous collaboration as separate product systems.

## Design disposition

The [E16 design package](../design/canvases-and-huddles.md) specifies all five
areas and acceptance scenarios C1–C8, H1–H6 and S1–S4. Checked tasks mean the
design deliverable is complete, not feature implementation or independent review.
Build, provider selection and capture remain deferred at the explicit review
gates in that package. No resources are provisioned or child issues created.

## Tasks

- [x] **E16.1 Decide canvas boundary.** Conversation attachment/tab model, access
  inheritance, explicit grants, document lifecycle, versioning, export, and search;
  any shared binary asset remains blocked by E8 until PAS supplies member-scoped
  private reads.
- [x] **E16.2 Specify a small block editor.** Text, lists, checkboxes, links,
  mentions, code, conflicts, autosave, accessibility, and mobile reading/editing.
- [x] **E16.3 Evaluate media infrastructure.** WebRTC SFU/provider, TURN/STUN,
  regions, costs, browser support, privacy terms, and feature flag. A huddle
  cannot reuse PAS rooms for media or signalling until an independently verified
  transport satisfies its peer/throughput needs; PAS rooms are capped at 32 peers,
  100 messages/second, 4 KB payloads, and no replay.
- [x] **E16.4 Design huddle lifecycle.** Channel/DM binding, join/access,
  device preflight, audio/video/screen-share, health, moderation, and fallback.
- [x] **E16.5 Set consent boundary.** Captions, notes, recording, transcription,
  AI summary, retention, notice, and deletion must each be approved separately.

## Acceptance criteria

- An invited huddle participant never gains underlying channel-history access.
- Recording/transcription/AI summary remain unavailable until consent and retention
  terms are accepted and technically enforceable.
