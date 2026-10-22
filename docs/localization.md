# Localization, time zones and RTL contract (#28)

Recorded 2026-10-22 for E14.5. English is the only shipped interface language.
This specification expands [inclusive experience](design/inclusive-experience.md).
Formatting preferences do not translate the interface or user-authored content.

## String inventory and externalization

| Surface/source | Strings to maintain in `web/src/strings.ts` |
| --- | --- |
| App, Channels | Session/workspace navigation, creation/join forms, empty and unavailable states |
| Conversation, ThreadPanel, MessageCard | Composer help, send/retry/copy, edit/delete confirmations, reactions, thread labels and announcements |
| Members, Mentions | Role/action labels, unread counts and accessible names |
| Settings, ChannelDetails, ExperienceProvider, Modal | Preferences/help, validation, dialog names, Close and save feedback |
| API/recovery boundary | Safe product error messages selected from error codes; never translate or render raw server error HTML |

The existing typed English catalogue is the source of interface sentences,
including accessible labels and live-region speech. Keep complete sentences and
named parameters; render substitutions as React text, never HTML. Names, channel
titles/topics, message bodies, URLs and emoji are data, not catalogue keys.
Static product branding and document metadata are reviewed separately from the
interactive catalogue. New UI text must enter the catalogue before shipping.

Use the existing TypeScript catalogue and native Intl formatters; no translation
SDK, service, provisioning or new PAS resource is selected. A future language
requires a complete typed catalogue with identical keys and parameter names,
reviewed plural branches, accessible wording and visual/reader validation.
Do not ship partial translations or a language selector that promises them.
Missing catalogue keys are build failures; a future runtime catalogue-load failure
falls back atomically to English with `lang=en`, `dir=ltr`, rather than mixing
languages. Existing `t` supports English and test-only pseudo expansion.

## Precedence, persistence and formatting

| Concern | Precedence and fallback |
| --- | --- |
| Interface language/direction | English / LTR today, regardless of formatting locale. Future explicitly selected complete interface catalogue, then supported browser language, then English; select a catalogue and its direction together |
| Formatting locale | Valid saved browser-local `locale`, then valid `navigator.language`, then `en`; canonicalize language tags with `validLocale` |
| Personal display zone | Valid saved `timeZone`, then browser Intl zone, then UTC; validate with `validTimeZone` |
| Workspace zone | Reserved for future workspace scheduling; never overrides personal display. No new workspace setting/schema is authorized |
| User-authored language | Author-supplied metadata if available, otherwise unspecified (`lang=""`); never infer from interface or formatting preference |

Preferences use `slackie:experience:v1`. Persist only locale, time zone, Enter
behavior and announcement opt-in; never private drafts/content. Invalid values
fall back independently; malformed/blocked storage uses browser defaults, then
en/UTC. Storage denial leaves controls usable in memory. Cross-tab storage changes
refresh preferences; browser defaults are resolved when preferences are loaded,
not promised to track OS changes without reload. The current locale validator
accepts structurally valid tags; Intl may resolve unsupported tags to an installed
locale. This is formatting fallback, not a promise to support that interface language.

Store and transport instants as epoch milliseconds/UTC, never formatted strings
or ambiguous wall-clock inputs. `formatTimestamp` shows year/month/day, hour/minute
and a named zone via Intl, with machine-readable ISO instants on time elements.
Keep absolute dates rather than stale relative text. Repeated DST hours must have
distinct zone labels; spring gaps cannot create invented instants. Locale changes
must not change the stored instant or chronological ordering. Future date grouping
must use the chosen display zone, including midnight boundaries. Scheduling with
ambiguous/nonexistent local times needs a separate reviewed resolution contract.

`formatCount` uses the formatting locale. Sentence grammar follows the **interface
catalogue**, not the numeric locale: English uses `one`/`other` even when digits
are Arabic. `messageSummary` uses English plural rules and formatted numbers.
Other count labels currently use invariant nouns or parenthesized counts. Future
catalogues must supply every category their own Intl.PluralRules selects, including
zero/two/few/many where applicable; never append an English “s” or concatenate
sentence fragments. Translation changes must cover spoken and visible counts.

## RTL and content-language decisions

A future approved Arabic/Hebrew catalogue sets root `lang` and `dir=rtl` together.
Changing numeric formatting to `ar-EG` alone keeps the English root LTR. Use logical
inline/block spacing, borders and positioning for navigation and thread panes;
mirror directional navigation affordances and pane placement with reading order.
Do not mirror avatars, emoji, media, code, or branded marks. Preserve chronological
message ordering and DOM/keyboard order consistent with the visible layout.
Physical safe-area insets remain tied to their physical device edge.

User message bodies, topics and composers use `dir=auto`, unspecified language,
and bidi isolation; identifiers/names inserted into interface text need isolated
boundaries (`bdi` or equivalent). A Latin URL or code fragment inside RTL content
must remain readable/copyable. Language and direction are independent: `dir=auto`
is not language detection. Never insert direction-control characters into stored
content to fix layout. Author language metadata and content translation are not
currently provided; no automatic translation or inferred author language is promised.

Readiness is not complete RTL-interface support. Audit remaining physical CSS,
interpolated names/accessible labels, truncation and focus order before enabling
any RTL catalogue. Existing content isolation and logical thread borders are a
baseline; forced root direction alone does not validate a translated interface.

## Validation plan and evidence

| Scenario | Procedure and required result | Evidence status |
| --- | --- | --- |
| Precedence/fallback | Saved valid locale/zone beat conflicting browser values; invalid fields fall back independently; malformed/denied storage and cross-tab changes remain usable | Existing pure/DOM checks; expanded independent fallback regression |
| Pseudo locale | Expand every catalogue label at least 40%; preserve named placeholders and substitute punctuation/markup-like user data literally | Catalogue unit checks; expanded placeholder regression |
| Long strings | Render expanded sentences, 200-character unbroken names/URLs and multiline errors in all inventory surfaces at 320px and 200/400% zoom; labels wrap, controls remain reachable, no horizontal document scrolling | Visual/browser review pending; helper expansion alone is insufficient |
| Plurals/numbers | 0, 1, 2, 5, 11, 101 with English interface and en/de/ar formatting; English grammar remains correct, digits follow selected format; future Arabic branches must cover all selected categories | Existing English tests plus mixed-format regression; translated catalogue checks gated on availability |
| DST/midnight | New York spring gap/fall overlap; Melbourne southern-hemisphere transitions; UTC/local midnight; same instant across locale changes, distinct repeated-hour labels | Existing New York regression plus Melbourne/locale-invariance regression |
| RTL/mixed content | Test-only root RTL with expanded labels, Arabic/Hebrew messages, Latin URLs, emoji and numerals in channels, dialogs, thread, preferences and errors; check pane order, isolation, copy fidelity and keyboard focus | Native browser/reader review pending; no shipped RTL catalogue |
| Content language | English interface + Arabic numeric locale + Hebrew/Arabic message: root remains English/LTR, time labels use formatting locale, content keeps auto direction and unspecified language | Existing DOM formatting/content checks; manual speech review pending |

Run visual scenarios in light/dark at desktop and narrow mobile sizes, including
VoiceOver/Safari and NVDA/Firefox reading and keyboard navigation. For every manual
run record reviewer/date/commit, OS/browser/reader versions, catalogue/formatting
locale/zone, viewport/zoom, fixture, expected/actual result, screenshot/speech,
finding owner and retest. Blank cells are not passes. Do not claim native reader,
translated RTL or visual long-string acceptance from unit tests.

## Design review record and gate

Repository consistency review, 2026-10-22: compared `strings.ts`, `experience.ts`,
ExperienceProvider, message/thread/content components, CSS and existing pure/DOM
QA with the issue scope. Decisions: typed sentence catalogue, English-only launch,
independent formatting preferences, personal zone precedence, UTC instants,
interface-language plurals and content-language separation. Existing coverage
establishes formatting policy, not complete localization readiness; the matrix
above records the remaining visual, translated RTL and native-reader work.

Product/design approval and manual validation: **pending**. No build-ready child
tasks are approved or created. Before creating any, the product/design owner must
record reviewer, date, reviewed decisions, findings and explicit approval here.
E14.5 manual acceptance remains unchecked. This review record specifies the
contract and gate; it does not invent owner approval or native validation.

Preserve `docs/research-foundations.md` and its PAS constraints. This decision
creates no resources, translation-service commitment, schema or provisioning.
