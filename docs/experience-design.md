# Experience and information architecture

## Primary navigation

The desktop layout uses a persistent workspace switcher and sidebar, a central
conversation pane, and an optional detail pane. Mobile collapses this into a
workspace/channel list and a full-screen conversation.

```text
Workspace
├── Home: activity, mentions, unread threads (attention design in E11)
├── Channels
│   ├── public channels available to the member
│   └── private channels the member belongs to
├── Direct messages (post-MVP; E11)
│   ├── one-to-one
│   └── group conversations
├── Later: saved items (post-MVP; E11)
└── Workspace administration (owners/admins only)
```

## Core journeys

### Owner creates a workspace

1. Choose workspace name and URL-safe handle.
2. Become the initial owner and land in `#general`.
3. Invite people by email or share a bounded invite link.
4. Create channels around active work, with a clear public/private choice.

### Member participates in a channel

1. Select a visible channel.
2. Scan newest context; load older history on demand.
3. Compose text, mentions, emoji reactions, or a safe external link.
4. Open a reply side pane to keep a topic's discussion together.
5. Mark notifications read only after the relevant position is recorded.

### Member finds prior context

1. Open the planned global search from the persistent header after the search
   capability is approved.
2. Search terms are limited to content the member is authorized to view.
3. Filter by conversation, person, date, or mentions.
4. Open a result at its message and load surrounding context.

## Message interaction rules

- Enter sends only when the chosen accessibility preference enables it; otherwise
  it inserts a line break.
- A client message ID supports optimistic rendering and idempotent retries.
- Edited messages retain an edited indicator; deleted messages retain a minimal
  tombstone only where policy permits.
- Reactions aggregate by emoji and member, one reaction per emoji/member.
- Mention suggestions include eligible people only; private-conversation members
  are never exposed as suggestions elsewhere.

## Empty, loading, and error states

- Explain why a member cannot see a private channel rather than implying it is
  empty.
- Keep unsent drafts locally while reconnecting.
- Show a recoverable failed-send affordance with retry and copy-text actions.
- Announce new messages through an accessible live region without stealing focus.

## Accessibility and responsive requirements

- Full keyboard navigation, visible focus, labelled controls, and semantic
  conversation landmarks.
- Respect reduced motion, text scaling, contrast, and system theme preference.
- Never depend on colour alone for presence, unread, role, or error state.
- Treat screen-reader announcements and notification settings as user controls,
  not product defaults.

## E14 first implementation slice: motion and forced colors

Decision (2026-10-20): use browser media preferences directly, without a new
setting or PAS resource. Review of the current CSS found button press scaling,
transitions, decorative glows, and translucent borders, with no reduced-motion
or forced-colors treatment. This slice addresses those gaps only.

- Reduced motion disables animation, transitions, smooth scrolling, and button
  press scaling, including preference changes while the app is open.
- Forced colors keeps browser color adjustment enabled. Canvas/CanvasText replace
  the decorative background; Highlight marks keyboard focus; ButtonText borders
  identify controls and dialogs; GrayText identifies disabled buttons.
- Message actions remain visible in forced colors, including on fine pointers.
  Dialog backdrops use the system canvas with partial opacity.
- Normal-mode appearance and existing responsive breakpoints remain unchanged.

Review boundary: these rules use existing semantic controls and do not change
navigation, authorization, transport, or data storage. Browser regressions verify
computed behavior and keyboard focus. They do not establish WCAG conformance or
replace NVDA/VoiceOver, real high-contrast themes, and 200-400% zoom review.
The remaining E14 decisions stay open; child issues must close their design gates
before splitting build-ready work. E14.1 is only partially implemented.
