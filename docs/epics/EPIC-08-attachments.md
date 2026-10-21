# E8 — Authorized shared attachments

**Status:** Blocked
**Priority:** Blocked on PAS platform capability
**Goal:** Enable private-channel file sharing without leaking a member's upload.

## Blocker

Current PAS storage is per-user private or public; it does not yet provide a
member-scoped shared-file authorization primitive suitable for channel/DM access.
A Slack-like attachment feature must not be simulated with public URLs, browser
tokens, D1 blobs, or message-room payloads.

## Tasks

- [ ] **E8.1 Request/verify platform primitive.** Document an API that authorizes
  read by current workspace/channel/DM membership and revokes access on removal.
- [x] **E8.2 Design file policy.** Types, size/quota, virus scanning, previews,
  link unfurls, retention, deletion, and legal/reporting treatment.
- [x] **E8.3 Design upload command.** Bind upload capability to sender,
  workspace/conversation, expiry, and final message transaction.
- [x] **E8.4 Design download/preview authorization.** Check parent-message
  visibility at access time and prevent stale public/share URLs.
- [ ] **E8.5 Test revocation.** Verify a removed member cannot fetch previously
  visible files and no binary leaks to logs, search, or rooms.

## Acceptance criteria

- PAS capability is independently verified in a sandbox before product work starts.
- File access obeys the same current membership predicate as its parent message.
- Until then, Slackie supports safe external links only.

## Review material and decision gates

The [authorized attachment proposal](../design/authorized-attachments.md) supplies
the E8.2–E8.4 design deliverables and an E8.5 sandbox/action/browser test matrix.
Checked design tasks mean the proposal is written, not approved or implemented.
E8.1 and E8.5 remain open: no independently verified PAS primitive or executable
attachment revocation results are available. Review and record the platform,
policy, protocol and operational decisions before creating build-ready child
issues. Keep this epic blocked and ADR-004 in force until those gates close.
