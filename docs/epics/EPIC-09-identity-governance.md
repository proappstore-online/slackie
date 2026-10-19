# E9 — Identity, ownership, guest policy, and governance

**Priority:** P0 design, P1 delivery
**Depends on:** E0, E1
**Goal:** Close lifecycle and authority gaps before production workspaces exist.

## Tasks

- [ ] **E9.1 Define primary ownership.** Exactly one active primary owner; decide
  additional-owner and administrator capabilities.
- [ ] **E9.2 Specify privileged transitions.** Transfer primary ownership with
  recipient acceptance, recent step-up, conditional last-owner protection, and
  content-free audit entry.
- [ ] **E9.3 Design member lifecycle.** Pending, active, suspended, deactivated,
  removed, and historical-attribution behavior.
- [ ] **E9.4 Bind and constrain invitations.** Store a hash of an opaque secret;
  define identity/email binding, expiry, revoke, issuer privilege ceiling, rate
  limits, and idempotent acceptance.
- [ ] **E9.5 Design guests before exposing them.** Specify guest types, sponsor,
  channel allow-list, expiry, discovery, DM, search, mention, conversion, and
  revocation rules.
- [ ] **E9.6 Establish data governance.** Define retention for messages, edits,
  tombstones, profiles, reports, audit, backups, and future files; decide export,
  deletion, legal-hold, and profile privacy boundaries.

## Acceptance criteria

- Only the primary owner may transfer primary ownership or start workspace deletion.
- A membership removal atomically revokes actions, change feed, rooms, search,
  mentions, notifications, and future file access.
- No generic guest is granted public-channel discovery without explicit policy.
- Retention and export behavior are stated before customer conversation data exists.
