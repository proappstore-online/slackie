# E13 — Trust, moderation, administration, and privacy operations

**Priority:** P1
**Depends on:** E5, E9
**Goal:** Give teams accountable controls without normalizing private-content access.

## Tasks

- [ ] **E13.1 Replace report-only flow with cases.** Report message/profile/channel/
  member, evidence policy, queue, disposition, notice, appeal, and confidentiality.
- [ ] **E13.2 Define enforcement.** No action, tombstone, restriction, mute,
  suspension, removal, reinstatement, and rate-limited appeal transitions.
- [ ] **E13.3 Build domain audit.** Transactional append-only, content-free events
  for authority, invitations, policy, moderation, retention, exports, and security.
- [ ] **E13.4 Design admin controls.** Directory, roles, channel policy, invitation
  domain policy, rate-limit insights, settings, and destructive confirmation.
- [ ] **E13.5 Design subject requests.** Account deactivation/deletion, export
  authority, approval, expiry/download logging, and legal-hold precedence.
- [ ] **E13.6 Produce incident runbooks.** Cover data access incident, abuse wave,
  account compromise, malware/file future, and realtime outage. The account-
  compromise runbook must state that PAS offers no app-visible global browser-
  session inventory or revocation; list supported local sign-out, credential-
  containment, and escalation steps instead of claiming unavailable control.

## Acceptance criteria

- Reporter identity never reaches the reported person.
- Any exceptional private-content review is policy-gated and audited.
- Audit records omit bodies, emails, secrets, signed URLs, and attachment bytes.
- Account-compromise operations do not claim app-level session inventory or
  global session revocation that PAS does not provide.
