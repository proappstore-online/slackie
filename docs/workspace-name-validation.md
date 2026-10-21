# Workspace creation validation (#31)

The create form immediately explains the allowed name format, sets aria-invalid,
associates inline help, and disables submission for invalid names. It disables
mobile automatic capitalization. A submit guard also rejects invalid input.

The registered workspace_create SQL action accepts 1–100 ASCII lowercase letters,
numbers, underscores and hyphens. It rejects whitespace, uppercase characters,
punctuation and embedded NUL characters without creating workspace, membership,
audit or activity rows. Its final batch result returns an explicit `error` row for
invalid names; the frontend batch adapter displays that message and keeps input.
Existing workspaces and the separate rename action are unchanged.

`pnpm test` includes real React DOM form tests (typing, submission guard, valid
creation and server error preservation), SQL validation and authorization tests.
The deployment workflow also runs Playwright against the delivered frontend.
Those browser tests mock PAS transport; they do not establish authenticated
production database creation or verify any owner's existing workspace.

## Outstanding production verification

Needs human: Serge must sign in to his own production account, confirm that the
workspace he manually corrected exists, opens and works. No owner credentials or
owner account session are used by these tests. Keep #31 open until this is done.
Authenticated production creation also needs independent verification; local SQL
and DOM tests alone do not establish this production acceptance criterion.
