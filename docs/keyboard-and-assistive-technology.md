# Keyboard interaction and assistive technology validation (#26)

## Scope and decisions

Recorded 2026-10-22 against the current React components and QA suites. This
specifies E14.3; it does not certify the parent E14 manual acceptance criteria.
Native controls remain the interaction model. No PAS provisioning is required.
The existing [inclusive contract](design/inclusive-experience.md) remains the
source for announcements, recovery and localization; this document expands its
keyboard decisions and review matrix.

## Keyboard contract and discovery

| Surface | Binding and behavior | Discovery/conflicts |
| --- | --- | --- |
| Page navigation | Tab/Shift+Tab follows rendered DOM order; Enter activates links; Enter/Space activates buttons | First Tab exposes Skip to conversation; visible focus must survive light/dark and forced colors |
| Workspace/channel navigation | Native select keyboard behavior; channel buttons activate with Enter/Space | Keep native semantics; no application-wide arrow-key interception or roving tabindex |
| Preferences/help | Experience preferences is a native details/summary disclosure; Enter/Space toggles it | Available to members as well as owners; contains keyboard help and Enter sends messages setting |
| Channel and reply composers | Enter sends by default; Shift+Enter inserts newline; Ctrl+Enter or Command+Enter explicitly sends | Help is associated with each composer; preference changes both composers |
| Newline preference | With Enter sends messages off, plain Enter inserts newline; explicit send binding remains | Browser-local preference; unavailable storage must not block using it |
| IME composition | Enter while composing never submits, including with Ctrl/Command | Composition confirmation has priority; Shift with any modifier never sends |
| Message actions | Tab to Reply, Edit, Delete or labeled reaction buttons; Enter/Space activates | Actions must be available without hover; reaction pressed state has semantics |
| Thread | Opening focuses its heading; Tab reaches Close and reply controls; Close restores connected reply opener | Thread is a nonmodal region; do not trap Tab or claim Escape closes it |
| Modal dialog | Open focuses Close; Tab/Shift+Tab stay inside; Escape or Close dismisses and restores opener | Named native dialog, safe initial action; background inertness supplied by showModal |
| Missing dialog opener | Restore channel-navigation heading, then workspace selector or conversation if available | No focus into removed private content; verify fallback after access loss |
| Native confirmation | Browser-owned delete confirmation; accept/cancel using platform keyboard interaction | No custom shortcut or destructive default added by this specification |
| Menus | Current navigation/actions are ordinary buttons, selects and disclosures | No ARIA menu or arrow-key menu contract is advertised; future custom menus need a separate reviewed focus/typeahead/Escape contract |
| Search | Full search remains gated by E12 | No global search binding or enabled search entry point until the owning epic is approved |

No command palette in MVP. No global single-letter, slash, Ctrl/Command+K or
browser Find overrides. Browser, OS and screen-reader commands retain priority.
Do not add accesskey attributes. A future palette requires an approved owning
scope, discoverable help, conflict review on Windows/macOS and a disable/remap
policy before global shortcuts ship. DMs and personal triage remain gated by E11.

Focus order includes the workspace preferences disclosure and current contextual
controls in their actual DOM positions; it must not use positive tabindex to
force a visual order. Opening modal content is the only keyboard trap. Incoming
messages and polling must not steal focus. Read-only pending composers retain
focus. Validation preserves input and exposes error text; disabled controls must
have adjacent explanatory context. Permission loss clears private context and
must leave a reachable authorized recovery destination.

## P0 journey matrix

Execute **every row** with NVDA/Firefox on Windows and VoiceOver/Safari on macOS,
at **200% and 400% browser zoom**, using keyboard only. Also run the mobile
navigation rows with VoiceOver/Safari on iOS and record its device zoom/display
settings separately. Desktop root-font scaling is not browser zoom evidence.
Use authorized test accounts for owner, member and private-channel nonmember;
use disposable content for mutations. No production credentials are implied.

| ID / journey | Keyboard procedure | Required speech, focus and recovery observations | Automated support / manual status |
| --- | --- | --- | --- |
| K01 Session/workspace | Sign in, create valid workspace; try invalid name; select workspace | Named fields, inline invalid explanation, no invalid creation; selected workspace identifiable | Workspace DOM/browser validation and SQL; reader/zoom pending |
| K02 Channels | Skip to conversation; return to navigation; create/join/select public channel; attempt unavailable private link | Skip destination announced; current channel identifiable; no inaccessible names/content disclosed | Link authorization DOM/SQL, skip-link browser; reader/zoom pending |
| K03 Dialog lifecycle | Open channel form; cycle forward/backward; Escape; reopen and Close; remove opener during access change | Named dialog, Close initially focused, background unreachable, opener/fallback restored | Modal browser containment and DOM fallback; native reader/zoom pending |
| K04 Send/recover | Type multiline draft; exercise default/newline preference, Shift and Ctrl/Command; confirm IME; induce send failure then retry | Correct send policy and help; no composition submission; retained draft, error once, same retry ID, focus retained | Both-composer DOM/unit/browser regressions; reader/zoom pending |
| K05 Threads | Activate Reply; navigate region and send reply; Close; repeat after polling | Heading announced on entry; reply label distinct; no trap; connected opener restored; no unsolicited focus movement | Thread browser and DOM focus/composer checks; reader/zoom pending |
| K06 Message lifecycle | Reach actions without hover; react/unreact; edit/save/cancel own message; cancel then confirm deletion | Action names and pressed state understandable; mutation errors recoverable; no color-only state | Message lifecycle browser and SQL authorization; reader/zoom pending |
| K07 Invite/members/settings | Owner invites, member joins through existing invite flow; inspect member directory and permitted settings; repeat as member | Roles/names understandable; forbidden controls absent or explained; native dialog restoration; errors preserve input | Existing membership/settings browser and SQL tests; reader/zoom pending |
| K08 Mobile/restoration | At narrow reflow use Channels → Conversation → Thread → Back; reload authorized link; traverse browser history | One reachable pane; hidden controls absent from focus order; no horizontal document scrolling; drafts follow restoration policy | Mobile browser and restoration DOM tests; real device/reader/zoom pending |
| K09 Recovery/preferences | Toggle help and Enter preference; simulate outage then revocation while drafting; recover to authorized channel | Help reachable; outage retains draft; revocation removes private text; focus has a reachable safe destination | Preference, outage/revocation DOM tests; reader/zoom pending |

For each run check that focused controls are visible and unobscured, labels and
errors remain readable without two-dimensional document scrolling, and every
required action remains reachable. Record browse/reading mode versus forms mode
and VoiceOver interaction/Quick Nav settings; test native navigation as well as
Tab. Inspect actual speech and accessibility names, not just visual appearance.
A failure blocks that journey's acceptance; link a finding with owner and retest.

## Evidence and review gate

Repository consistency review, 2026-10-22: compared Modal, ThreadPanel,
MessageCard, ExperienceProvider, composer and existing QA coverage. Decisions:
native control semantics, no MVP palette/global shortcuts, shared composer
preference, safe modal entry/restoration, nonmodal threads and owning-epic gates.
Existing dialog restoration alone is insufficient evidence for P0 journeys.

Automated tests can establish event handling, DOM focus and authorized recovery;
jsdom mocks dialog APIs and cannot prove native containment, screen-reader speech,
browser zoom or native key activation. Playwright checks native keyboard behavior
with mocked SDK transport; those checks also cannot establish NVDA/VoiceOver
acceptance. Test execution results belong in the delivery report, with blockers
and failures stated separately from the planned scenarios above.

Manual review evidence: **not performed; pending**. Product/design approval:
**pending**. No build-ready child tasks are approved or created by this record.
Before creating them, the product/design owner must record the reviewer, date,
covered decisions, matrix findings and explicit approval here. Parent E14 stays
unchecked until its native-reader and zoom evidence exists. Unavailable owning-
epic capabilities remain gated even after design approval.

Use this evidence template for each matrix cell (a blank is not a pass):

| Journey | Date/reviewer | Commit | OS/browser/reader versions | Zoom/viewport/input mode | Steps and expected result | Actual speech/focus/reflow | Pass/fail, evidence link, finding owner/retest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Not run | Pending |

Preserve docs/research-foundations.md and its platform constraints. This design
adds no resources, provisioning, future-epic UI or conformance claim.

## Revision validation (2026-10-22)

`pnpm test` passed: TypeScript, 791 SQL assertions across 47 actions, 39 unit/DOM
checks including new thread entry/return and dialog name/initial-focus/cancel
regressions, plus contrast thresholds. `pnpm test:browser` was attempted but
Chromium could not launch because its executable is absent. Installation with
`pnpm exec playwright install chromium` failed: Playwright does not support
Chromium on this host's macOS 12. No browser or manual-reader pass is claimed.
