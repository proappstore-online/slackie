# E15 — Integrations, bots, and workflows

**Priority:** P2
**Depends on:** E9, E10, E13
**Goal:** Add automation only after tenant authority, audit, and durable jobs are sound.

## Design disposition

The [E15 design package](../design/integrations-and-workflows.md) covers all six
scoped tasks, decision gates and acceptance scenarios. Checked tasks mean design
completion, not runtime delivery or independent approval. E9/E10/E13 and the
worker authority adapter remain release dependencies. No provisioning or child
issues are authorized until the recorded gates close.

## Tasks

- [x] **E15.1 Create app registry and install lifecycle.** Metadata, visibility,
  workspace install, approval, disable/uninstall, and ownership.
- [x] **E15.2 Define OAuth and scopes.** Consent, actor attribution, encrypted
  credentials, rotation/revocation, and no invisible privilege escalation.
- [x] **E15.3 Define bot/event/webhook contracts.** Signed inbound/outbound events,
  channel membership, retries, dead letter, delivery log, and rate limits.
- [x] **E15.4 Define interactive surfaces.** Slash commands, actions, link unfurls,
  signed payload expiry, replay prevention, and privacy controls.
- [x] **E15.5 Design workflow runtime.** Versioned draft/publish lifecycle,
  triggers, form/conditional/webhook steps, jobs, retries, concurrency, audit,
  errors, cancel/retry, and initiator/install authority.
- [x] **E15.6 Defer marketplace.** Identify review, security, support, and
  monetization prerequisites separately.

## Acceptance criteria

- An integration or workflow cannot read or post beyond its explicit actor and
  installation grant.
- Every action is attributable, rate-limited, revocable, and auditable.
