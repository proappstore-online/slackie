# E5 — Trust, accessibility, and release quality

**Priority:** P1
**Depends on:** E1–E4
**Goal:** Ensure core collaboration is respectful, comprehensible, and operable.

## Tasks

- [ ] **E5.1 Design report and moderation workflow.** Confidential report creation,
  evidence state, queue, decision, reporter privacy, and audit trail.
- [ ] **E5.2 Define rate and abuse controls.** Message limits, policy copy,
  throttling/retry behavior, removal, and appeal decision.
- [ ] **E5.3 Complete accessibility specification.** Keyboard map, focus order,
  labels, live regions, contrast, reduced motion, text scaling, and error recovery.
- [ ] **E5.4 Create state catalogue.** Empty, loading, offline, permission denied,
  deleted, archived, invite expired, and optimistic-failure states.
- [ ] **E5.5 Establish observability/privacy rules.** Metrics, redaction,
  privileged action audit, incident data, and retention boundaries.
- [ ] **E5.6 Create QA suites.** Unit/action negative tests plus E2E paths for
  auth, invitations, private access refusal, messaging, reconnect, and sign-out.

## Acceptance criteria

- Every P0 flow works with keyboard and screen reader expectations documented.
- Reports and moderation never disclose reporter identity to the reported user.
- Each role/scoped endpoint has a corresponding negative authorization test.
