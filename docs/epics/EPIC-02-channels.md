# E2 — Channels and access control

**Priority:** P0
**Depends on:** E0, E1
**Goal:** Make topic-based collaboration discoverable without leaking private work.

## Tasks

- [ ] **E2.1 Define channel entity and lifecycle.** Public/private type, unique
  name, topic, description, archival, rename, and creator policy.
- [ ] **E2.2 Specify membership policy.** Join/leave public channels; invite,
  remove, and recover private channel membership; decide channel-manager role.
- [ ] **E2.3 Design channel list and discovery.** Detail public discovery and the
  exact non-member/private empty states.
- [ ] **E2.4 Design channel header and details.** Include privacy, topic, member
  access, archive state, and permission-aware affordances.
- [ ] **E2.5 Implement query/action permission matrix.** List, read, create,
  update, archive, room authorize, search and mention paths use shared predicates.
- [ ] **E2.6 Add negative tests.** Prove private names, topics, records, and room
  joins are not exposed to an owner or member lacking channel membership.

## Acceptance criteria

- A public channel is discoverable only in the viewer's workspace.
- A private channel is invisible outside active channel membership.
- Archive preserves readable history for authorized people and prevents new posts.
