# Research foundations

Slackie is inspired by collaboration patterns, not intended as a visual or
feature-for-feature Slack replica. The design work used several review passes
against primary Slack guidance and local PAS platform standards.

## Product-pattern sources

- [Channels](https://slack.com/help/articles/360017938993-What-is-a-channel),
  [direct messages](https://slack.com/help/articles/212281468-Understand-direct-messages),
  and [threads](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)
  inform the workspace/conversation/thread model.
- [Roles](https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack),
  [guests](https://slack.com/help/articles/202518103-Understand-guest-roles-in-Slack),
  [retention](https://slack.com/help/articles/203457187-Customize-data-retention-in-Slack),
  and [exports](https://slack.com/help/articles/201658943-Export-your-workspace-data)
  inform lifecycle and governance epic requirements.
- [Unread messages](https://slack.com/help/articles/226410907-View-all-your-unread-messages),
  [notifications](https://slack.com/help/articles/360025446073-Guide-to-Slack-notifications-Guide-to-Slack-notifications),
  and [search](https://slack.com/help/articles/202528808-Search-in-Slack)
  inform separate attention, retrieval, and read-state models.

## PAS constraints that shape scope

- The future build starts from platform/templates/template-workspace and uses
  authenticated, SQL-authorized actions; platform app roles are not workspace roles.
- platform/docs/adr/010-room-authorization.md makes rooms declared and
  authorized. Rooms are bounded, ephemeral, and no-replay; they are only hints.
  Slackie therefore requires a durable, body-free conversation change feed.
- PAS rooms support at most 32 peers, 100 messages per second, and 4 KB payloads.
  A channel above that active-viewer envelope needs explicit degraded polling or
  an approved alternative transport.
- PAS storage does not currently offer member-scoped shared private reads. Shared
  binary attachments remain blocked rather than falling back to public objects.
- PAS does not provide an app-owned offline conflict engine or app-visible global
  browser-session inventory/revocation; Slackie documents these as platform
  dependencies instead of promising unsupported controls.

## Review outcome

The design is intentionally sequenced: safe multi-tenant channels/messages first;
durable sync, attention, search, and governance next; DMs, integrations, media,
enterprise, and AI only when their authority and operating models are complete.
