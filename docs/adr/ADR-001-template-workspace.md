# ADR-001: Start future implementation from template-workspace

**Status:** Accepted for design

## Context

Slackie needs tenant memberships, invitations, auditable roles, authenticated
actions, and negative authorization tests. Older chat applications in this
workspace predate current protected-room guidance.

## Decision

Use PAS template-workspace as the implementation baseline. Its workspace,
membership, invite, D1 migration, action, and QA patterns are adapted rather
than recreated. Do not reuse client fan-out chat code from older apps.

## Consequences

The build inherits a tested tenant model but must tailor every action and query
to channel visibility. This decision does not authorize a template provision,
repository scaffold, or app deployment.
