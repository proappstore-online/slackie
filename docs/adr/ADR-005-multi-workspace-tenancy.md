# ADR-005: Slackie is a multi-workspace, multi-tenant product

**Status:** Accepted

**Date:** 2026-10-19

## Context

The product brief and early epic documentation left the choice between
single-workspace and multi-workspace tenancy as an open decision gate
(roadmap Phase 0, EPIC-00 task E0.2). All architecture, data-model, and
security documents already assumed tenant-scoped rows, tenant-scoped
permissions, and cross-tenant isolation — evidence that multi-workspace
tenancy was the implicit design direction throughout.

The owner has now made this an explicit adopted decision: Slackie will
support multiple independent workspaces (tenants) from launch, each fully
isolated at the data, permission, and API layers.

## Decision

Slackie is a **multi-workspace, multi-tenant** product.

Every workspace is an independent tenant. Strict tenant isolation applies
at every layer:

- **Data layer** — every persistent entity (users, channels, messages,
  attachments, reactions, threads) carries a `workspace_id` foreign key;
  all queries are workspace-scoped; cross-workspace queries are prohibited.
- **API / service layer** — every authenticated request resolves to exactly
  one workspace; the resolved workspace is validated against the caller's
  membership before any resource access.
- **Realtime layer** — pub/sub rooms and presence state are namespaced by
  workspace; a client subscribed to workspace A cannot receive events for
  workspace B.
- **Identity layer** — a user account may belong to multiple workspaces
  but holds a separate membership record, role, and permission set in each;
  there is no cross-workspace role inheritance.

This decision supersedes the open gate in the roadmap and closes task E0.2
in EPIC-00.

## Consequences

- Task E0.2 ("Decide tenancy model") in EPIC-00 is **closed as complete**.
- The roadmap Phase-0 decision gate for tenancy is **resolved** and must
  not appear as a future choice.
- Product brief, architecture, data-model, roadmap, and affected epics must
  reflect multi-workspace tenancy as a settled fact, not a pending option.
- Implementation scope is unchanged; this ADR records a design decision, not
  a new feature.
- PAS validation (availability check, provisioning preview) remains
  outstanding and is not affected by this decision.
- Strict tenant isolation requirements are preserved and strengthened, not
  relaxed.

## Alternatives considered

| Alternative | Reason not chosen |
|---|---|
| Single-workspace (one global tenant) | Incompatible with the existing data-model and permission design; contradicts the owner's stated intent for a multi-team product. |
| Defer to implementation | Creates continued ambiguity that blocks downstream design decisions; the implicit direction was already multi-workspace throughout the design. |
