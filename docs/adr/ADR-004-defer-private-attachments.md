# ADR-004: Defer shared private attachments

**Status:** Accepted for design

## Context

Current PAS storage is per-user private or public. Slackie needs channel/DM
member-scoped reads that revoke when membership changes.

## Decision

Do not include binary shared uploads in MVP. Permit safe external links only and
keep a blocked epic until PAS provides and documents a suitable authorization
primitive.

## Consequences

Slackie does not make unsafe file-sharing claims. The future attachment solution
must pass access-revocation tests before it enters product scope.
