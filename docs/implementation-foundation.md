# Foundation scaffold status

The current increment implements the explicitly requested channel-based scaffold,
not a production MVP or completion of E0/E1. The browser renders only a loading
shell. No resources are provisioned and no deployment workflow is installed.

## Layout and local verification

- `mcp.json`: 19 authenticated registered SQL actions using the requested
  `workspace_*`, `channel_*`, `message_*`, and `reaction_*` names.
- `migrations.json`: initial workspace, membership, channel, message, reaction,
  and content-free audit tables. These migrations have not been applied to PAS.
- `web/`: React/Vite, platform-cookie SDK initialization, template CSS/PWA assets.
- `qa/actions.mjs`: template-derived SQLite transaction harness and positive and
  negative tests executing the registered SQL itself, including foreign keys.
- `.github/workflows/`: CI tests/typecheck and template compliance; no deploy job.

Use `pnpm install`, `pnpm test`, and `pnpm build`. The build invokes the official
`@proappstore/cli` compliance check; a successful local check does not establish
hosted action acceptance or PAS capacity behavior.

## Explicit scaffold choices

- Follow the latest requested channel-specific schema and action names. Existing
  design documents retain the intended generic conversation architecture and
  earlier action catalogue. Reconcile those contracts before a production
  migration; this scaffold does not supersede that architecture.
- Workspace creation bootstraps an owner atomically. A unique partial index
  prevents multiple owners. No registered action removes/demotes the owner or
  grants a second owner. Secure ownership transfer remains unimplemented.
- Owner/admin can add ordinary members directly by platform user id for this
  scaffold. Only the owner can grant admin or update ordinary roles; admins
  cannot remove peers or owners. This is not the secure invitation lifecycle.
- Private metadata and content require channel membership even for privileged
  workspace roles. Privileged actors outside a private channel cannot add
  themselves to it. Channel creation joins its creator atomically.
- Per the latest scaffold request, channel-member admins/owners may tombstone
  others' messages. This differs from E3's author-only delete design and must
  be ratified before release. Deleted bodies are erased from the current row.
- Client-chosen message ids are stable retry keys, with database uniqueness;
  sends return batch mutation counts, not a canonical message response. Fetch
  through `message_list`. Canonical ID generation and response reconciliation
  remain production gates.
- `channel_mark_read` uses server time and monotonic guards, not a conversation
  change cursor. Messages use timestamp/id keyset pagination with fixed 50-row
  pages. These are preliminary contracts, not E10/E11 completion.
- Every mutation is an atomic batch ending in a body-free `audit_log` insert,
  gated on the preceding statement's `changes()` and actor membership.
- Tenant keys and composite foreign keys protect scoped joins. Workspace-member
  deletion cascades channel membership; historical messages/reactions remain.

## Remaining gates

E0 product/privacy decisions; E1/E9 invitation binding, expiry/revocation,
membership statuses, ownership transfer/step-up and governance; generic
conversations; threads; revision conflicts; durable body-free change feed and
sync; realtime authorization/capacity validation; complete attention semantics;
rate limiting; CSP/CSRF review; browser accessibility/E2E and usability evidence.

No realtime subscription or room declarations are shipped, so nothing treats
rooms as durable storage. Attachments, DMs, search, guests, exceptional private
review, integrations, huddles, enterprise, and AI remain unavailable. Private
shared-file support, name/route availability, and PAS provisioning validation
remain unresolved. Retention/export/deletion policy must be decided before
customer data is accepted. No epic should be marked complete from this scaffold.
