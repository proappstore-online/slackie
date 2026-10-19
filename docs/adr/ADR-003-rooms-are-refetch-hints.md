# ADR-003: Realtime rooms are authorization-gated refetch hints

**Status:** Accepted for design

## Context

PAS rooms have bounded peers/payloads and no durable replay. They cannot safely
serve as a private message store or delivery guarantee.

## Decision

Declare a protected channel room pattern with a SQL join authorizer. After an
authorized message action, clients send body-free change hints. Recipients refetch
the canonical timeline; reconnect and focus trigger the same reconciliation.

## Consequences

The product remains correct when rooms are unavailable, duplicate events, or miss
events. It trades a small refetch cost for stronger privacy and consistency.
