# ADR-002: Registered actions and D1 are canonical

**Status:** Accepted for design

## Context

A chat UI is vulnerable if clients can choose a tenant, room, user, or mutation
without a server-side authorization predicate.

## Decision

All durable reads and writes occur through authenticated registered actions.
Each action enforces workspace membership and channel visibility in SQL, uses
bounded named columns, and records auditable privileged changes. D1 is canonical;
browser caches are ephemeral.

## Consequences

The UI may be optimistic, but it reconciles to canonical action responses. Every
scoped action requires a negative authorization test.
