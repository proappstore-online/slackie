# Slackie foundation

React/Vite browser shell backed by ProAppStore registered SQL actions.

- Every durable read/write is a registered authenticated action in mcp.json. Never use app.db in a user path.
- Every scoped statement checks workspace membership on :__user_id; client ids are hints. Creation bootstraps the first owner atomically.
- Privileged writes check SQL roles. Private-channel membership is required even for owners.
- Every mutation is a batch ending in a content-free audit_log insert guarded by changes() and membership.
- Schema lives in additive migrations.json; never edit applied migrations.
- Add negative authorization tests in qa/actions.mjs for every action.
- pnpm install; pnpm test; pnpm build. No deployment workflow or provisioning is authorized.

Platform conventions and Application Standard: https://proappstore.online/skills.md
