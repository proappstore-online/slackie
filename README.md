# Slackie

Slackie is a team communication app foundation for ProAppStore. This repository
contains the design library, registered SQL actions, additive migrations, a
React/Vite loading shell, and local authorization tests. It is not a usable or
production-ready messaging app yet. No deployment workflow is enabled.

## Product in one sentence

A focused, searchable workspace for small teams to hold channel conversations,
direct messages, and threads without the complexity of an enterprise suite.

## Current status

Foundation scaffold. No PAS app, database, worker, or public route has been
provisioned from this repository. See [implementation status](docs/implementation-foundation.md)
for the provisional schema and remaining release gates.

Requires Node >=22.13 and pnpm 10.30.3. Run `pnpm install`, `pnpm test`, and
`pnpm build`. `pnpm dev` serves the loading shell; hosted PAS actions require
separate platform setup. `pnpm build` runs the platform compliance check first.

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
