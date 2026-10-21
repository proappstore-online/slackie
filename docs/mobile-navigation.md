# Mobile navigation decisions (#25 / #32)

This slice uses Channels, Conversation and Threads tabs below 640px. Desktop
retains the workspace sidebar and simultaneous conversation/thread panes.
DMs, full search and personal triage remain gated by their owning epics.
No PAS provisioning or authorization changes are introduced.

Flow: Channels -> select authorized channel -> Conversation -> reply -> Thread.
Back: Thread -> Conversation -> Channels. Bottom tabs can jump between views.
Threads without an open root explains how to open one. Members, mentions and
settings open in the content view; bottom tabs return to channel content.

Tabs and the top back arrow preserve mounted conversation/reply drafts and
scroll positions. Selecting another channel/workspace, losing membership or
signing out discards private context as before. Nothing private is persisted
in URLs or storage. Refresh starts from the authorized workspace/channel list.
Browser back retains native host behavior; it is not intercepted or guaranteed
to exit to an OS home screen. URL navigation/restoration across reloads remains
future work: channel selection is not itself a URL deep-link implementation.
Any future deep link must reauthorize workspace, channel and thread via actions
before rendering content and must handle missing/revoked resources explicitly.

The shell is a viewport-height flex column with non-scrolling bars. Middle
panes scroll; message lists fill remaining pane height. Safe-area insets belong
to the bars, avoiding duplicate root padding. Chrome can resize content for the
keyboard via interactive-widget; dvh responds to dynamic viewport sizing.
Actual keyboard behavior, iOS splash appearance and installed PWA chrome still
require a real phone review and cannot be proved by desktop viewport resizing.

Review coverage: Playwright checks 375px navigation, one visible pane, clipped
skip link/focus activation, current-user profile, back behavior, draft retention,
viewport shrink, and 200% root text reflow. Controls retain 2.75rem minimum height.
Review 320px and 400% text separately, landscape and touch targets on real devices;
verify reachable composers and no horizontal overflow. Test permission loss while
away in another tab, temporary outages, and server-authorized unavailable roots.
Production mobile screenshots must distinguish mocked transport from real sessions.

Run the mobile browser checks against deployed assets with SLACKIE_BASE_URL set
to the production origin and pnpm test:browser --grep "skip link|mobile". These
checks mock PAS responses and never write production records. Leave the variable
unset for the local full suite. The screenshot at 375x480 also checks that the
send button remains in view after viewport shrink.

## E14 link restoration update (2026-10-21)

The previous reload/deep-link limitation is superseded by query parameters
`workspace`, `channel` and optional `thread`. URLs carry identifiers only; workspace
and channel lists and scoped thread-root reads reauthorize before content appears.
Unknown/revoked identifiers show generic unavailable states. Native browser back
restores selection through those reads. No message bodies, names or drafts enter
the URL or persistent storage. Mobile tab/back view changes preserve mounted
private drafts; channel/workspace changes and confirmed revocation discard them.
DOM regressions cover restoration, denied identifiers, browser back and polling
while on the channel-list tab. Real phone/zoom review remains outstanding.
