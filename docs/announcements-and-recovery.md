# Bounded announcements and recovery (#27)

## Scope and decisions

E14.4/E14.6 design recorded 2026-10-22 against Conversation, ThreadPanel,
ExperienceProvider, recovery and the existing QA suites. This expands the
[inclusive contract](design/inclusive-experience.md) and preserves the #22
transient-draft versus confirmed-revocation boundary. No PAS provisioning,
new storage, offline queue or conflict resolution is proposed. Preserve
[research-foundations.md](research-foundations.md) and its platform constraints.

## Event and announcement policy

Use one persistent polite, atomic region for background message counts. The
message list itself must never be live. Counts default off; the browser-local
“Announce new message counts” preference controls both channel and thread.
Aggregate authorized arrivals into at most one summary per five-second window;
use counts only, without names, bodies, channel titles or room payloads. Own sends,
edits, deletions, older pages and initial/reconnect baselines are silent. Never
move focus or scroll for background updates. Only an explicit successful send
may scroll to its result.

Clear queued speech on opt-out, document visibility change, mobile-pane change,
conversation/thread unmount, workspace switch, sign-out and confirmed access
loss. Resume from a fresh authorized baseline, without catch-up speech. Desktop
channel and thread counts share the same summary budget. Room hints only trigger
scoped authorized reads. They cannot authorize content or supply speech.

User-action errors use a local alert once per failed attempt; unchanged polling
errors must not be repeatedly inserted or announced. Loading, sending and
reconnected statuses use polite transition text once, never a spoken countdown.
Do not echo the same event into both local and global regions. The background
count opt-out does not suppress essential action errors. Do not add an assertive
background feed or focus an alert automatically.

## State / event / recovery matrix

Each row specifies the intended contract, including tests still requiring review.
“Copy” always means an explicit Copy draft action while authorized, never automatic
clipboard access. No draft exists outside mounted memory. Refresh/reload does not
restore it. Retry is user initiated and reauthorizes; reads may continue polling,
but mutations never automatically replay.

| ID / journey and event | Visible state and retry/copy behavior | Speech and focus | Validation |
| --- | --- | --- | --- |
| R01 Workspace/channel/thread loading | Loading workspace/messages/thread; prevent duplicate sends | Polite on entry; retain current focus | Delayed reads; no repeated polling speech |
| R02 Empty workspace/channel/thread | Create workspace or authorized channel action; “No messages yet” / “No replies yet”; authorized composer remains available | Static empty text; no unsolicited speech or focus change | Empty lists, owner/member actions, first message |
| R03 Pending channel send/thread reply | Sending; keep draft read-only and focusable; disable duplicate send; no Copy until failure | Polite once; retain composer focus | Hold mutation unresolved, try repeat Enter/click; one mutation |
| R04 Transport failure/offline in any journey | Connection unavailable; preserve mounted content/draft; Refresh messages or repeat Send/Send reply after reconnection; Copy draft on failed send | One error transition; retain focus and scroll | 503/network failure, clipboard success/denial, same-ID retry |
| R05 Rate-limited read/send/reply | Too many requests; wait before retry; preserve draft and allow Copy on failed send; honor a trusted retry interval if supplied, otherwise give no invented duration | Error once; no countdown speech; focus stays | 429, no automatic mutation retry; explicit retry reuses ID |
| R06 Permission-denied action | Access denied; select an available workspace/channel; no automatic mutation retry | One error; keep authorized navigation reachable | 401/403 clears private data and draft, cancels speech, removes Copy |
| R07 Confirmed channel/workspace removal or unavailable thread root | Generic conversation/thread/workspace unavailable; return to authorized Channels or workspace selector; no private names, draft or Copy | No forced error focus; if focused content is removed, focus channel-navigation heading, then workspace selector | Authorized lists/root reads, scope changes, safe focus fallback |
| R08 Unknown/deleted deep-link target | Generic unavailable; select authorized destination; never silently redirect to another conversation | Static explanation after navigation; normal navigation focus | Unknown IDs never fetch inaccessible content or expose existence |
| R09 Archived channel/thread | Text “archived” and read-only explanation; disable composers; retain in-memory draft while authorization remains; no resend until authorized writable state | Polite on transition; if disabled composer held focus, move to conversation heading | Archive while drafting, reader explanation, no mutation |
| R10 Expired/unavailable invite | Invite expired or unavailable; request another invite; no blind retry, recipient details or Copy | Alert once after attempted join; retain requesting control or safe navigation | 404/410 in invite context; future invite acceptance surface gated by owning scope |
| R11 Reconnect | Refresh authorized reads before accepting restored state; preserve transient draft; explicit same-ID send retry | Baseline is silent for message counts; one connection transition, no catch-up flood; no focus/scroll change | Outage then arrivals; room reconnect and polling |
| R12 Switch workspace/channel, sign out | Discard old private content/drafts and pending IDs; new authorized selection only | Cancel queued speech; normal explicit-navigation focus | No private data in URL/storage; no delayed old summary |

Same-ID retry applies to an unchanged failed message. Editing its content creates
a new attempt ID; confirmation from an authorized read clears the draft. Copy
failure explains that text can be selected manually and preserves the draft.
A 429 or outage must never masquerade as revocation. Explicit 401/403, confirmed
membership removal and unavailable authorized thread-root results clear the
relevant private context; transport failure alone does not. A generic 404 must
not be used to infer permission to retain or disclose inaccessible content.

## Presentation across input and display modes

Use text labels “Private”, “Archived”, “External” and “Guest” wherever those
conditions are exposed, together with accessible names/state semantics. Icons
and color may reinforce these words; they cannot replace them. External/guest
features remain gated by their owning epic; this is no new enabled capability.

Recovery text, Copy and retry controls must remain visible in the active mobile
pane. Use existing 2.75rem control heights and visible keyboard focus. At 320 CSS
pixels, 200% and 400% browser zoom, landscape and with the on-screen keyboard,
wrap long errors and labels without horizontal document scrolling or obscuring
actions. Touch and keyboard activate the same actions; no hover-only recovery.
Reduced motion removes nonessential animation and animated auto-scroll. Forced
colors uses system text, borders and focus indicators; errors and disabled states
retain words and structure. Validate real Windows contrast themes using the
[visual review](visual-system.md), not just CSS emulation.

## Test evidence and review gate

Existing executable coverage in qa/experience.mjs and qa/experience-integration.mjs
covers floods, own/history silence, opt-out, hidden panes, reconnect, authorized
links, both composers, transient draft retention, clipboard fallback and revoked
content. Additional #27 regressions cover hidden-document cancellation with a
fresh baseline and 429 versus 403 recovery in both composers. These are DOM/SDK
boundary tests, not evidence of actual screen-reader speech or server authorization.
SQL tests remain the authorization evidence; browser tests exercise native UI.

Repository consistency review (2026-10-22): count batching, mounted draft and
retry-ID behavior match the existing implementation. Remaining design-to-build
gaps include centralized deduplication across local status/error regions, polite
pending/archive transition speech, and focus fallback on every removed/disabled
recovery surface. The matrix specifies these outcomes; this design issue does
not claim that every future UI behavior or invite flow is implemented.

Product/design approval: **pending**. Manual NVDA/Firefox on Windows and
VoiceOver/Safari on macOS/iOS: **not performed**. Before any build-ready child
tasks are created, the product/design owner must review R01–R12 and the event
policy, record findings and explicit approval below. No child tasks are created
or approved here. Parent E14 acceptance remains unchecked.

Run R01–R12 using keyboard, touch where applicable, both readers at 200%/400%
zoom, reduced motion and real contrast themes. Observe actual speech frequency,
focus/scroll, reachable actions, draft secrecy and reflow; test repeated failures
and rapid scope switches. Record failures with owner and retest evidence.

| Date / reviewer / commit | Matrix rows and OS/browser/reader versions | Zoom/input/theme/motion | Actual speech/focus/reflow and evidence | Findings / owner / retest / approval |
| --- | --- | --- | --- | --- |
| Pending | R01–R12; not run | Pending | No manual result claimed | Pending design review |

## Revision validation (2026-10-22)

`pnpm test` passed: TypeScript, 791 SQL assertions across 47 actions, all 41
unit/DOM tests and measured light/dark contrast checks. `pnpm test:browser`
attempted all 51 scenarios but every scenario failed at browser launch because
the Chromium executable is missing. `pnpm exec playwright install chromium`
failed because this Playwright version does not support macOS 12. The installed
Google Chrome also cannot launch because a required system framework symbol is
absent. No browser, reader or real-device pass is claimed.
