# E14 inclusive interaction decisions

Proposed 2026-10-21 for #17 and follow-ups #26–#28. This is a design
contract, not approval to implement the remaining features. Existing visual
and mobile decisions remain in [visual-system.md](../visual-system.md) and
[mobile-navigation.md](../mobile-navigation.md). No PAS resources are needed.

## Keyboard and focus (#26)

Use native buttons, links, selects, details and modal dialogs. Tab follows DOM
order: skip link, workspace controls, channel navigation, conversation controls,
composer, thread. Skip link targets the conversation landmark. Do not introduce
roving tabindex to ordinary navigation links. Selected channels have a textual
name and current-state semantics; private/archived/guest/external states require
words, never only a colored dot.

| Context | Key | Decision |
| --- | --- | --- |
| Navigation/control | Tab / Shift+Tab | Next/previous enabled control; visible focus |
| Button / link | Enter; Space on button | Native activation |
| Dialog | Escape | Close top dialog; restore opener if still connected |
| Dialog | Tab / Shift+Tab | Native modal containment, both directions |
| Dialog entry | Open | Focus Close for current forms; no destructive default |
| Composer | Enter | Current behavior sends, Shift+Enter inserts newline |
| Composer | IME Enter | Confirm composition without submitting |
| Thread | Close | Return to originating reply control if still available |
| Future search/menu | Any | Define in owning epic before exposing controls |

No global single-character shortcuts or command palette in MVP. Browser and
assistive-technology shortcuts retain priority. A future shortcut help surface
must expose bindings and a disable option before global bindings ship. The
existing Enter-to-send behavior differs from the preference described in
experience-design.md; a configurable newline/send preference remains proposed,
not delivered. Native modal behavior is the baseline, not proof of all journeys.
If an opener disappears after permission loss, the proposed fallback is the
channel-list heading, then workspace selector when no channel remains.

## Announcements and recovery (#27)

Proposed policy: one persistent polite, atomic status region for background
updates and one assertive error region for the user's failed action. Do not make
the whole message list live. Background message announcements default off until
a user enables them. Coalesce enabled updates over five seconds into a count,
never a message body or sender. Cap speech at one summary per interval; do not
replay history after reconnect or announce hidden workspaces. Clear queued
announcements on channel switch, sign-out or confirmed authorization loss.
No announcement moves focus or scrolls the conversation. Room hints trigger
authorized refetches, not speech or inferred membership.

| State/event | Visible text and recovery | Announcement/focus contract |
| --- | --- | --- |
| Loading | Loading conversation; prevent duplicate submits | Polite once, focus stays |
| Empty | No messages yet; show composer if authorized | No unsolicited speech |
| Pending send | Sending; retain draft until confirmed | Polite once; focus stays in composer |
| Send failed/offline | Not sent; Retry and Copy text | Error once; keep transient draft in memory |
| Rate limited | Try again after server retry interval | Error once; no countdown speech or automatic resend |
| Archived | Archived, read only; disable composer | Polite on transition, no color-only badge |
| Expired invite | Invite expired; request another invite | Error after attempted join; no recipient disclosure |
| Permission denied | Action unavailable; authorized navigation remains | Error once; no automatic mutation retry |
| No access/deleted | Conversation unavailable; return to channels | Clear private content/drafts on confirmed revocation |
| Reconnect | Refresh authorized state before enabling actions | One summary, no historical announcement flood |

Transient transport failures must not masquerade as revocation. Confirmed
revocation clears private data; copy recovery is available only while access is
still valid. Do not persist private drafts in URLs/storage or promise an offline
conflict engine. Retry uses the same client message ID and existing authorization.
A generic unavailable state must not reveal existence of an inaccessible channel.

## Localization (#28)

Proposed initial interface language: English. Inventory includes App session and
workspace text; Channels navigation/forms; Conversation and ThreadPanel composer,
status and errors; MessageCard actions/timestamps; Members roles; Mentions counts;
Settings and ChannelDetails; Modal labels; accessible names and announcements.
Server error codes map to safe localized messages; raw server text is not a
translation key or trusted HTML. User names, messages and channel titles are data.

Adopt a typed message catalogue with semantic keys and named parameters before
adding a second language. Whole sentences are translated; no concatenated plural
suffixes, HTML strings or positional fragments. Use Intl plural rules and
number/date formatting. Keep interpolation as React text and require all keys
and parameters in every shipped catalogue. No translation service commitment.

Proposed precedence: explicit valid user locale, supported browser language,
then en. Match exact locale then supported base language. Invalid settings fall
back rather than crashing. Interface locale is independent of content language.
For time zones use valid user IANA zone, browser zone, then UTC; workspace zone
is for workspace schedules, not an implicit override of personal display.
Store instants as UTC, show a full date and named zone on timestamp details,
and recompute relative dates at local midnight. Never store a formatted date as
the source value. Persisting new preferences requires a later schema decision.

RTL readiness requires logical CSS properties and mirrored navigation placement,
not mirrored avatars or media. Root lang/dir follows interface language; user
content uses dir=auto with isolated names, URLs and interpolated identifiers.
Content language remains unspecified unless author metadata provides it; do not
infer a language from a user's interface setting. Translation availability must
not imply translated user content.

## Acceptance tests and review gates

| Test | Expected result | Evidence required |
| --- | --- | --- |
| Keyboard P0 journeys | Create workspace/channel, invite/join, send/reply, react, manage members and settings without pointer; errors recoverable | Browser plus manual |
| Modal cycle | Entry focus inside, forward/backward wrapping, Escape restores opener | Automated regression |
| Announcements | 100 arrivals coalesce; history silent; disabled setting silent; focus unchanged | Future fake-clock/live-region tests and screen reader |
| Access loss vs outage | Outage retains draft; confirmed removal clears private state and speech queue | Transport regressions and manual review |
| Long strings | Pseudo-locale expansion 40%, no clipped labels at 320px | Future localization browser tests |
| Plurals | Counts 0, 1, 2, 5, 11 and 101 use locale rules | Future catalogue unit tests |
| DST/time zone | Instants around spring gap/fall overlap remain distinct; midnight grouping uses chosen zone | Future Intl unit tests |
| RTL/mixed text | Arabic/Hebrew interface, Latin URLs and names retain readable order | Future browser plus native reader review |
| Preference fallback | Invalid locale/zone and unavailable storage render English/UTC fallback | Future preference unit tests |
| Reflow/touch | 200% and 400% zoom, 320px, landscape, keyboard open; controls reachable | Real device and browser review |

Run each P0 journey with NVDA/Firefox on Windows and VoiceOver/Safari on macOS
and iOS. Record OS/browser/reader versions, date, zoom, steps, actual speech,
focus destination and findings. Review real Windows contrast themes per #24.
Automated assertions cannot supply this evidence. Current automated modal tests
cover only a subset; future tests above are specifications, not passing claims.

Review finding: existing mobile navigation has no reload/deep-link restoration;
existing composer has no send preference; a complete catalogue, announcement
controls and manual assistive-technology evidence are absent. These remain open
under #25–#28. Resolve findings and record design review before creating build-ready
child tasks. Keep every incomplete E14 checkbox open and do not close #17 until
its manual acceptance criteria and dependent review gates are satisfied.
