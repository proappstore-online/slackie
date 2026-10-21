# E14 inclusive interaction decisions

Design recorded 2026-10-21 for #17 and follow-ups #26–#28. The subsequent
user instruction explicitly requested implementing these contracts, including
code and tests, and closing #17 after the non-browser checks pass. Existing visual
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
Enter-to-send default preserves existing behavior; the browser preference now
allows Enter to insert a newline instead. Ctrl/Command+Enter explicitly sends
in both modes, and IME confirmation and Shift+Enter never send. Native modal behavior is the baseline, not proof of all journeys.
If an opener disappears after permission loss, the proposed fallback is the
channel-list heading, then workspace selector when no channel remains.

## Announcements and recovery (#27)

Implemented policy: one persistent polite, atomic status region for background
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

Initial interface language: English. Inventory includes App session and
workspace text; Channels navigation/forms; Conversation and ThreadPanel composer,
status and errors; MessageCard actions/timestamps; Members roles; Mentions counts;
Settings and ChannelDetails; Modal labels; accessible names and announcements.
Server error codes map to safe localized messages; raw server text is not a
translation key or trusted HTML. User names, messages and channel titles are data.

The typed English catalogue in `web/src/strings.ts` externalizes labels, help,
errors, confirmations, accessible names and status text. Dynamic sentences use
named parameters. Add a complete catalogue before shipping a second language. Whole sentences are translated; no concatenated plural
suffixes, HTML strings or positional fragments. Use Intl plural rules and
number/date formatting. Keep interpolation as React text and require all keys
and parameters in every shipped catalogue. No translation service commitment.

Formatting precedence: explicit valid browser-local locale, browser locale,
then en. Interface language remains English until a reviewed complete translation
is shipped; a formatting locale does not promise a translated interface. Invalid
settings fall back rather than crashing. Interface locale is independent of content language.
For time zones use valid user IANA zone, browser zone, then UTC; workspace zone
is for workspace schedules, not an implicit override of personal display.
Store instants as UTC and show full absolute dates and a named zone, including
across midnight and DST transitions. Absolute labels avoid stale relative dates. Never store a formatted date as
the source value. Only locale, time zone, Enter behavior and announcement opt-in are persisted
in browser-local storage. Storage denial falls back to in-memory controls; no
new server schema or translation resource is provisioned.

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
| Announcements | 100 arrivals coalesce; history silent; disabled setting silent; focus unchanged | DOM timer regressions; manual reader review pending |
| Access loss vs outage | Outage retains draft; confirmed removal clears private state and speech queue | Transport regressions and manual review |
| Long strings | Pseudo-locale expansion 40%, no clipped labels at 320px | Future localization browser tests |
| Plurals | Counts 0, 1, 2, 5, 11 and 101 use locale rules | Catalogue unit tests |
| DST/time zone | Instants around spring gap/fall overlap remain distinct; midnight grouping uses chosen zone | Intl unit tests |
| RTL/mixed text | Arabic/Hebrew interface, Latin URLs and names retain readable order | Future browser plus native reader review |
| Preference fallback | Invalid locale/zone and unavailable storage render English/UTC fallback | Preference unit tests and DOM storage regressions |
| Reflow/touch | 200% and 400% zoom, 320px, landscape, keyboard open; controls reachable | Real device and browser review |

Run each P0 journey with NVDA/Firefox on Windows and VoiceOver/Safari on macOS
and iOS. Record OS/browser/reader versions, date, zoom, steps, actual speech,
focus destination and findings. Review real Windows contrast themes per #24.
Automated assertions cannot supply this evidence. The regression evidence below covers automated behavior. The table also retains
future native-reader and visual review scenarios; those are not passing claims.

## Implementation and review record (2026-10-21)

The explicit follow-up user instruction authorized implementation. Review against the
existing API confirmed that workspace/channel lists and scoped thread-root reads
remain the authority for URL restoration. No SDK transport, SQL authorization,
PAS resources or private-draft persistence changed.

- `ExperienceProvider.tsx` supplies controls to all users, including members,
  validates locale/zone input, follows cross-tab changes and tolerates unavailable
  storage. Help exposes native keyboard behavior; no command palette is advertised.
- `experience.ts` centralizes formatting, composer policy, authorized-list
  selection, bounded link parsing and ID-only message observation. One persistent
  polite region summarizes opted-in arrivals every five seconds. Disabled,
  hidden, initial, reconnect and historical loads are silent. Scope/access changes
  clear queued summaries. Room hints never supply announcement text or authority.
- Incoming updates preserve focus and scroll. Only a successful explicit send
  scrolls to its result. Pending composers remain focusable/read-only. Failed
  sends retain retry IDs and offer Copy draft; explicit access loss clears private
  drafts and data. Transport errors map to bounded product text without exposing
  server internals. Invite-expiry policy is catalogued; there is no new invite
  acceptance service in this epic.
- Query links contain workspace/channel/thread IDs only. Authorized reads restore
  selection on refresh and browser back; missing resources show a generic
  unavailable state and never silently select another conversation. Browser/OS
  back remains native. Mobile tabs retain mounted drafts; polling does not force
  a navigation change. Thread opening/closing updates its URL identifier.
- English strings and named interpolation live in one typed catalogue. Intl formats
  timestamps (including named zones), counts and English sentence plurals. User
  content is isolated with `dir=auto`/`bdi` and unspecified content language.
  Interface remains `lang=en`, `dir=ltr`; Arabic numeric/date formatting does not
  claim a translated Arabic interface. A pseudo-localizer supports expansion tests.
- Existing visual tokens, themes, motion/forced-color rules and independent mobile
  layout are retained. Recovery alerts are visible on mobile; narrow headers wrap,
  user content wraps and preference labels meet the control height policy.

Automated evidence is executable in `qa/experience.mjs` and
`qa/experience-integration.mjs` through `pnpm test`. Pure tests cover malformed and
blocked storage, locale/zone precedence, DST gap/overlap and midnight, plurals,
pseudo-locale expansion, IME/modifiers, announcement floods/reconnect/reset,
link parsing and authorized selection, and recovery classifications. DOM tests
mount the real React app with only the SDK boundary mocked: authorized/unavailable
links and browser back, one bounded summary preserving focus/scroll, both
composers and idempotent retry, clipboard fallback, mobile drafts/navigation,
access revocation, focus fallback, cross-tab formatting and opt-out cancellation.
Native dialog containment and visual reflow remain in the browser suite.

Manual NVDA/VoiceOver P0 journeys at 200–400% zoom, actual Windows contrast themes,
real-phone keyboard/reflow and translated RTL interface review are still unverified.
DOM tests do not establish WCAG conformance or replace those reviews. Follow-up
review issues #24–#28 remain the evidence locations; no manual result is invented.
