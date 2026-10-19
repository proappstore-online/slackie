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
- [ ] **E8.2 Design file policy.** Types, size/quota, virus scanning, previews,
  link unfurls, retention, deletion, and legal/reporting treatment.
- [ ] **E8.3 Design upload command.** Bind upload capability to sender,
  workspace/conversation, expiry, and final message transaction.
- [ ] **E8.4 Design download/preview authorization.** Check parent-message
  visibility at access time and prevent stale public/share URLs.
- [ ] **E8.5 Test revocation.** Verify a removed member cannot fetch previously
  visible files and no binary leaks to logs, search, or rooms.

## Acceptance criteria

- PAS capability is independently verified in a sandbox before product work starts.
- File access obeys the same current membership predicate as its parent message.
- Until then, Slackie supports safe external links only.
