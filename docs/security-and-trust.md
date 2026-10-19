# Security and trust model

## Authorization matrix

| Capability | Owner | Admin | Member | Guest (future) |
| --- | --- | --- | --- | --- |
| Manage owners/workspace | Yes | No | No | No |
| Invite and manage ordinary members | Yes | Policy-controlled | No | No |
| Create/join public channels | Yes | Yes | Yes | Policy-controlled |
| Create private channels | Yes | Yes | Policy-controlled | No |
| Read/post in a private channel | Only as member | Only as member | Only as member | Only as member |
| Moderate reported content | Yes | Policy-controlled | No | No |

The UI communicates this model but cannot enforce it. SQL/action predicates
enforce every row-level decision.

## Threat controls

| Threat | Control |
| --- | --- |
| Cross-workspace IDOR | Membership predicate in every scoped action plus negative tests. |
| Private-channel leakage | Filter channel lists, search, mentions, rooms, reports, and messages by membership. |
| Forged room events | Declared SQL-authorized rooms; body-free peer hints; action refetch. |
| Duplicate sends | Author-scoped client nonce and canonical action response. |
| XSS | Plain text or strictly allowlisted markup; no raw HTML rendering. |
| Browser injection | A restrictive Content Security Policy is defined before release; minimize sources, prohibit unsafe script execution, and test it against all supported flows. |
| CSRF | Any server-rendered or cookie-authenticated form flow uses origin validation and CSRF protection; action-only flows document why the control is not applicable. |
| Authentication/invite abuse | Login, recovery (if introduced), and invitation acceptance have per-identity and per-source rate limits with safe retry feedback. |
| Secret compromise | Signing secrets, API keys, and integration tokens have an owner, least privilege, encrypted storage where applicable, rotation/revocation procedure, and no-log rule. |
| Vulnerable dependency | Locked dependencies, automated vulnerability scanning, review/patch SLAs, and release-blocking treatment for critical exploitable findings. |
| Abuse | Length limits, rate limits, reports, removal, auditable moderation. |
| Log/telemetry disclosure | Record metadata only; exclude content, tokens, and signed URLs. |
| Last-owner lockout | Conditional mutations and dedicated tests. |

## Privacy commitments and limits

- Slackie makes no end-to-end encryption claim.
- Workspace owners do not automatically read private channels; exceptional review
  needs an explicit policy, authority, audit record, and user-facing notice.
- Browser caches are session-scoped and cleared on sign-out. Private content is
  not retained in persistent browser storage by default.
- Data export, retention, legal holds, eDiscovery, SSO/SCIM, and enterprise audit
  are later work, not implied promises.
- File attachments are blocked until PAS supports authorized shared private reads.

## Test gates

For every scoped or role-gated action, test outsider workspace, removed member,
private-channel non-member, insufficient role, malformed ID, retry/idempotency,
and concurrent state transition. Validate room denial, sign-out cache clearing,
tombstone behavior, and report confidentiality in E2E scenarios.
