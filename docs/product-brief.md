# Product brief

## Problem

Small, distributed teams need a dependable place for short-lived coordination and
durable decisions. Email fragments context, group chats are hard to search, and
full enterprise collaboration suites impose cost and administration beyond many
teams' needs.

## Target users

- Workspace owners creating an internal home for a team of roughly 3–100 people.
- Members discussing work in topic-based channels, with private direct messages
  as a separately approved post-MVP capability.
- Moderators maintaining a respectful, secure workspace without reading ordinary
  private conversations by default.

## MVP job to be done

When I need to coordinate work with my team, I can join the right workspace and
channel, find the current context, post a message or reply in a thread, and know
that only intended participants can see it.

## MVP scope

1. Create and administer a workspace.
2. Invite or remove members and assign the approved primary-owner, owner,
   administrator, or member role. Guest access remains a separately designed phase.
3. Create public and private channels; browse only channels the person may see.
4. Send, edit, delete, and react to messages in visible channels.
5. Reply in a thread and maintain a per-channel unread baseline.

## Explicit non-goals for MVP

- Audio/video huddles, canvases, workflow automation, external federation, and
  an app marketplace.
- Direct messages, full-text search, push notifications, presence, and shared
  attachments; each has its own post-MVP epic and permission/capability review.
- Cross-workspace shared channels.
- End-to-end encryption claims; data is protected by platform and app access
  controls instead.
- Importing or syncing a third-party Slack workspace.

## Principles

- **Context before interruption.** Channels and threads make the subject and
  audience clear before people are notified.
- **Private by default where it matters.** Direct messages and private channels
  are never discoverable to non-members.
- **Fast under imperfect networks.** Optimistic messaging must reconcile safely
  and never silently lose authored content.
- **Search is a core experience.** It is a post-MVP capability only after its
  membership-scoped index and results contract are verified.
- **Simple administration.** The core role model stays small and visible.

## Success measures

- A new invited member reaches their first readable channel within two minutes.
- 95% of accepted messages are available to an authorized timeline refetch within
  two seconds under normal network conditions.
- No authorization test can retrieve a private channel or message for a
  non-member.
