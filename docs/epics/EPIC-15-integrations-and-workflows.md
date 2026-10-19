# E15 — Integrations, bots, and workflows

**Priority:** P2
**Depends on:** E9, E10, E13
**Goal:** Add automation only after tenant authority, audit, and durable jobs are sound.

## Tasks

- [ ] **E15.1 Create app registry and install lifecycle.** Metadata, visibility,
  workspace install, approval, disable/uninstall, and ownership.
- [ ] **E15.2 Define OAuth and scopes.** Consent, actor attribution, encrypted
  credentials, rotation/revocation, and no invisible privilege escalation.
- [ ] **E15.3 Define bot/event/webhook contracts.** Signed inbound/outbound events,
  channel membership, retries, dead letter, delivery log, and rate limits.
- [ ] **E15.4 Define interactive surfaces.** Slash commands, actions, link unfurls,
  signed payload expiry, replay prevention, and privacy controls.
- [ ] **E15.5 Design workflow runtime.** Versioned draft/publish lifecycle,
  triggers, form/conditional/webhook steps, jobs, retries, concurrency, audit,
  errors, cancel/retry, and initiator/install authority.
- [ ] **E15.6 Defer marketplace.** Identify review, security, support, and
  monetization prerequisites separately.

## Acceptance criteria

- An integration or workflow cannot read or post beyond its explicit actor and
  installation grant.
- Every action is attributable, rate-limited, revocable, and auditable.
