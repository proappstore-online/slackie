# Slackie

Slackie is a team communication app foundation for ProAppStore. This repository
contains the design library, registered SQL actions, additive migrations, a
React/Vite channel conversations with threads and mentions, member management,
workspace settings, onboarding, and local authorization tests.
Hosted use requires PAS setup; this is not production-ready. No deployment
workflow is enabled.

## Product in one sentence

A focused workspace for small teams to hold channel conversations.

## Current status

Foundation scaffold. No PAS app, database, worker, or public route has been
provisioned from this repository. See [implementation status](docs/implementation-foundation.md)
for the provisional schema and remaining release gates.

Requires Node 24 (used in CI) and pnpm 10.30.3. Run `pnpm install`, `pnpm test`, and
`pnpm build`. `pnpm dev` serves the app shell; hosted PAS actions require
separate platform setup. `pnpm build` runs the platform compliance check first.

Browser interaction tests use mocked PAS transport: run `pnpm exec playwright
install chromium`, then `pnpm test:browser`. An existing Chrome/Edge executable
can be selected with `SLACKIE_BROWSER`. These tests do not validate hosted PAS.

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

## Naming

`slackie` is the preferred PAS identifier and `Slackie` is the product name. The
name and intended public route remain subject to a final authenticated PAS
availability check and provisioning preview.
