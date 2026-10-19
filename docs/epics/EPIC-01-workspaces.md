# E1 — Workspace membership and invitations

**Priority:** P0
**Depends on:** E0
**Goal:** Build a safe tenant boundary with clear membership lifecycle.

## Tasks

- [ ] **E1.1 Model workspaces and memberships.** Define additive migration and
  action schemas for workspace, member profile, role, status, and audit records;
  incorporate E9 lifecycle and governance decisions as they are resolved. E1
  may design its core boundary after E0, but cannot be declared production-ready
  until the E9 governance gate is closed.
- [ ] **E1.2 Design workspace creation and initial ownership.** Seed only the
  minimal onboarding state and protect ownership transfer.
- [ ] **E1.3 Design invitation lifecycle.** Cover create, expiry, revoke, accept,
  duplicate invite, and failed/revoked acceptance states.
- [ ] **E1.4 Specify membership changes.** Cover role update, removal, voluntary
  leave, suspended members, and last-owner guard.
- [ ] **E1.5 Design workspace switcher and member directory.** Expose only
  workspaces/members the viewer is authorized to see.
- [ ] **E1.6 Build authorization test matrix.** Test outsiders, stale invites,
  cross-tenant IDs, and concurrent last-owner changes.

## Acceptance criteria

- A user cannot obtain a workspace record, list, or mutation by substituting an
  ID from another workspace.
- A workspace cannot end with zero active owners.
- Invitation commands are one-time, expiring, revocable, and fully auditable.
- E1 is not production-ready until E9 has approved ownership, membership
  lifecycle, invitation, and retention/governance decisions.
