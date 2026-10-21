# E12 — Authorized search and retrieval

**Priority:** P1
**Depends on:** E2, E3, E9, E10
**Goal:** Make prior context retrievable without revealing inaccessible content.

## Tasks

- [ ] **E12.1 Choose index lifecycle.** D1 FTS or approved alternative, maintained
  in the same action batch as canonical changes, never by a client-side filter.
- [ ] **E12.2 Design query grammar.** Words, quoted phrase, in, from, date, and
  thread filters; bound length/results and safe invalid-syntax behavior.
- [ ] **E12.3 Define index removal.** Edit, tombstone, archive, membership loss,
  retention expiry, and rebuild/recovery behavior.
- [ ] **E12.4 Design result UX.** Snippets, highlights, context window, cursor
  pagination, deep-link fallback, and permission-safe unavailable state.
- [ ] **E12.5 Add people/channel discovery.** Access-aware suggestions and
  autocomplete with private channel and guest restrictions.
- [ ] **E12.6 Validate relevance and privacy.** No query/body telemetry, no global
  query then client filter, and an answer-should-not-exist test suite.

## Acceptance criteria

- Losing membership immediately removes access to historical indexed hits.
- Deleted text cannot survive in a snippet, autocomplete, cache, or export.
- Every returned hit is currently authorized or resolves to no private metadata.

## Design proposal and review status

[Authorized search proposal](../design/authorized-search.md) covers E12.1–E12.6
and the required negative acceptance-test matrix against the current actions.
It is awaiting review; checklist items remain open. FTS capability, E9 guest and
retention policy, and E10 recovery/invalidation decisions must be approved before
implementation and build-ready child issues. Issue #9 remains open.
