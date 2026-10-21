# Attachment service integration boundary

`attachments.mjs` is a server-only service with mock-tested token issuance,
redemption, membership checks and deletion. It is not wired into the deployed
Vite app. It does not establish PAS shared-file capability or close E8/#13.

Instantiate it per authenticated request (or provide request-local `currentUser`)
in a trusted Node server. Never expose the signing key or a privileged SDK
session to a browser. The `requestingUserId` arguments must match `currentUser()`;
they do not authenticate a request. Use a random secret of at least 32 bytes.
Tokens last 60 seconds, are bound to the caller, and do not replace session auth.
Key rotation invalidates existing tokens. Exclude token query strings from
access logs, telemetry and errors.

Required adapters:

- `storage.upload/download/delete`: private SDK Storage-compatible operations
  under a stable trusted server principal. The upload adapter must quarantine,
  validate actual byte types and scan before success. SDK upload alone does not
  supply those controls. No public/review storage fallback is acceptable.
- `channels.get(id)`: canonical workspace binding and archive status.
- `membership.isMember(workspaceId, channelId, userId)`: both live workspace and
  channel membership. `isAdmin(workspaceId, userId)` uses workspace authority,
  not platform app roles. Missing/expired identities must fail closed.
- `metadata.get/insert/markDeleted`: durable private metadata. Insert must repeat
  posting authorization atomically; markDeleted must repeat current membership
  and owner/admin authorization atomically and enqueue durable byte cleanup.
  Failed uploads also need orphan reconciliation. Do not use the tests' Maps
  or Sets as production adapters.

Mount a dedicated HTTPS endpoint that authenticates the session and calls
`downloadAttachment(token, authenticatedUserId)`. Catch `AttachmentError` and
return its status with a generic response and `Cache-Control: private, no-store`;
map unexpected failures to a generic 503 without logging tokens. The handler
must not implement alternate redirects, static object routes or unguarded HEAD,
conditional or range responses. Only the returned response streams private
bytes. The service checks membership both before and after fetching upstream;
it cannot retract previously delivered bytes or cancel a stream on later
membership loss without platform support.

Before product integration, provide and sandbox-test this server/storage path,
implement durable adapters and transactional message linkage, bind reads to live
parent-message deletion/retention visibility, and enforce quotas/scanning and
reconciliation. Then add composer/display UI and integration tests against PAS.
Channel-bound metadata in this module is not yet message-bound metadata; DMs
also need their approved conversation model. Until then, the production app
continues to support safe external links only. The mock suite establishes service
logic, not platform enforcement or production readiness.
