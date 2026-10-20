# Slackie foundation

React/Vite workspace/channel/message shell backed by ProAppStore registered SQL actions.

- Every durable read/write is a registered authenticated action in mcp.json. Never use app.db in a user path.
- Every scoped statement checks workspace membership on :__user_id; client ids are hints. Creation bootstraps the first owner atomically.
- Privileged writes check SQL roles. Private-channel membership is required even for owners.
- Every mutation writes guarded, content-free audit_log and activity_log rows in the same action batch; derived writes are explicit action statements.
- Schema lives in additive migrations.json; never edit applied migrations.
- Add negative authorization tests in qa/actions.mjs for every action.
- pnpm install; pnpm test; pnpm build. Deploy main through the platform reusable workflow; provisioning is separate.

Platform conventions and Application Standard: https://proappstore.online/skills.md
