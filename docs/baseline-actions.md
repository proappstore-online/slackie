# Baseline and action invariants

Issue #29 replaces the seven never-deployed migrations with `0001_baseline`.
It creates the final ten tables and eleven indexes directly, without triggers,
backfills, cascades, or data writes. Identity remains platform-owned; replies
remain messages with `parent_id`, rather than separate users or replies tables.

Before this change, all four repository deployment attempts failed migration
preflight validation (runs 39385156716, 39398489395, 39398994075, 39399334771).
The platform validates the entire submitted manifest before forwarding any SQL
to the data worker. Issue #29 also confirms no production tables/data exist.
The baseline deliberately uses strict CREATE statements, so an unexpected
existing schema fails rather than being silently accepted or overwritten.

Every authenticated mutation keeps its original guarded write first, preserving
the frontend's first-result contract. Its existing audit insertion uses
`changes()` to refuse logging on denied/no-op writes. The next statement copies
that audit row (via `last_insert_rowid()` and `changes()`) into activity with the
same ID, actor, target, action, and server timestamp.

Within the atomic batch, activity `changes` temporarily holds `pending` to gate
derived writes. The final statement restores `{}`. This marker cannot survive a
successful batch and is rolled back on failure. It prevents same-millisecond
retries from reusing an earlier audit record, and avoids depending on row counts
from optional mention/cleanup steps. No message content enters either log.

Member creation assigns its generated mention handle in the INSERT. Message
send/reply/edit batches extract bounded-token, case-insensitive mentions only for
current workspace/channel members and exclude the sender. Edits remove obsolete
recipients and insert new ones, preserving seen state for unchanged recipients.
Deletion removes all derived mentions. Reply insertion checks the parent scope,
root status, and deletion state before writing; actions never change parent_id.

Member removal and channel leave explicitly remove dependent channel membership
and mention rows. Those two foreign keys are deferred until transaction commit
so the primary removal can remain the first batch result. All foreign keys must
be valid when the batch commits; no cascade performs hidden cleanup.

`qa/actions.mjs` executes the real registered SQL against SQLite with foreign keys
enabled. It covers authorization, default handles, both message-action naming
sets, mention token boundaries, seen state, edits/deletes, membership revocation,
invalid reply parents, same-clock retries, and transaction rollback. Failure
injection is in the test harness, without schema triggers.
