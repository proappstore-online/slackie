# Slackie

Slackie is a Slack-style team messaging MVP on ProAppStore (PAS). It implements
multi-workspace conversations with strict workspace and private-channel access
checks. The current build passes local tests but has outstanding acceptance and
release gates; it is not production-ready.

## Architecture and features

- PAS platform-cookie authentication and authenticated registered SQL actions
  in `mcp.json`; the browser never decides authorization.
- D1 relational storage with additive migrations in `migrations.json`.
- React/Vite frontend; protected PAS rooms carry body-free refetch hints,
  with ten-second polling when realtime is unavailable.
- Workspaces, public/private channels, messages, edits/deletion, reactions,
  threads, mentions and an in-app notification inbox, member roles/profiles,
  owner-only workspace renaming, and onboarding.

Notifications currently mean in-app mentions, not push/email delivery. Guests,
DMs, attachments, search, integrations, huddles, enterprise, and AI are deferred.

## Product in one sentence

A focused workspace for small teams to hold channel conversations.

## Current status

The feature implementation is incomplete against the canonical epic backlog.
See [implementation decisions and acceptance review](docs/implementation-foundation.md)
for schema choices, verification evidence, and the remaining gates for each issue.

## Development

Requires Node 24 (used in CI) and pnpm 10.30.3:

```sh
pnpm install && pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm dev
pnpm build
```

`pnpm test` runs typecheck and the SQL authorization/assertion suite. Browser
tests are a separate `pnpm test:browser` command and use mocked PAS transport;
they do not validate hosted PAS. An installed Chrome/Edge executable can be
selected with `SLACKIE_BROWSER` instead of installing Chromium.

`pnpm build` runs the platform compliance check first. Hosted authentication,
actions, and rooms require separate PAS setup; a local Vite server alone does
not supply those services.

## Deployment

Pushes to `main` invoke the PAS reusable deployment workflow: apply the committed
`0001_baseline`, register authenticated actions, then upload the frontend to
https://slackie.proappstore.online. Schema contains no triggers or cascades; action
batches maintain member handles, mentions, activity records, and membership cleanup.
See [baseline and action invariants](docs/baseline-actions.md).

## Design library

- [Documentation index](docs/README.md)
- [Product brief](docs/product-brief.md)
- [Experience and information architecture](docs/experience-design.md)
- [System architecture](docs/system-architecture.md)
- [Data model](docs/data-model.md)
- [Realtime and API contract](docs/realtime-and-api.md)
- [Security and trust model](docs/security-and-trust.md)
- [Delivery roadmap](docs/roadmap.md)
- [Epics and tasks](docs/epics/README.md)
- [Architecture decision records](docs/adr/)

## Naming

`slackie` is the preferred PAS identifier and `Slackie` is the product name. The
name and intended public route remain subject to a final authenticated PAS
availability check and provisioning preview.
