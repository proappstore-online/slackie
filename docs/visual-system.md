# Visual system and contrast review — issue #24

Decision record: 2026-10-21. Scope is the existing React/Vite product. No PAS
provisioning, new navigation, density setting, or child build tasks.

## Component inventory

| Source | Components and states reviewed |
| --- | --- |
| App.tsx | Sign-in providers, session/loading/error, workspace selector, creation details/form, invalid name, pending/disabled submit, empty workspace |
| Channels.tsx | Sidebar channel navigation, selected page, private/archived text labels, creation dialog, loading/empty/no-access |
| Conversation.tsx, MessageCard.tsx | Composer, editable message, reactions/pressed, message actions, timestamps, failed send, archived/read-only channel |
| ThreadPanel.tsx | Root/replies, reply composer, loading/error, stacked pane |
| Members.tsx | Member list, role badges, profile/admin forms, disabled role actions |
| Mentions.tsx | Unread count, inbox, empty/loading/error, acknowledgement |
| Settings.tsx, ChannelDetails.tsx | Owner/admin/read-only forms, save/pending/error/status, channel metadata |
| Modal.tsx | Native dialog, backdrop, close, focus restoration |

## Decisions

- Semantic colors: `paper` is the opaque content/control surface; `paper-deep`
  is hover/selected/disabled fill; `ink` is body, heading and control text;
  `muted` is secondary text; `line` is decorative separation only;
  `line-strong` identifies controls; `focus` identifies links, selected borders
  and keyboard outlines; `danger`/`danger-soft` identify error text/surface.
  `disabled` is readable inactive text without opacity reduction. Success and
  warning colors are reserved for labelled status messages on paper.
- Warm accent, sky and mint gradients remain decorative brand resources. Do
  not use them for small text or control boundaries. Content sits on opaque
  paper so decorative background compositing cannot change these measurements.
- Manrope with system sans-serif fallback: body 1rem/1.5, supporting text
  .875rem, h1 2rem/1.2 weight 800, h2 1.5rem/1.3 weight 700, h3 1.125rem
  weight 700. Fraunces is reserved for optional editorial display, never forms.
  Browser zoom remains enabled; stored small/large text scales root to 87.5%/
  118.75%. Message text is selectable and wraps without preserving long widths.
- Spacing scale: .25, .5, .75, 1, 1.5, 2rem; control padding .6rem is retained
  for compatibility. Radii: .5rem controls, .75rem dialogs. One comfortable
  density, minimum 2.75rem button/summary/select height. No compact toggle.
- Responsive: <=640px single conversation column; <=950px thread below
  conversation; above these thresholds retain sidebar and thread columns.
  At >=1024px only decorative background placement changes. Shell max 80rem,
  padding 1rem; dialogs min(36rem, viewport minus 2rem), max-height 85dvh.
  These original responsive decisions are superseded by #32: below 640px,
  independent mobile views sit between persistent bars. See mobile-navigation.md.
- Focus: 2px solid focus outline with 3px offset on interactive elements,
  including inputs, selects, textareas and summary. Focus contrasts with both
  paper and paper-deep. Hover uses paper-deep; selected/pressed adds underline,
  weight and a focus-colored border. Disabled uses native disabled semantics,
  readable text and no transparency. Pending actions keep their textual labels.
- Invalid inputs use a 2px error border and existing textual error/help;
  alerts add error surface and 3px leading border. Status, empty, loading,
  private, archived and permission states retain descriptive words rather than
  color alone. Native validation is not styled as invalid before interaction.
- Reduced motion retains the previous no-transition/animation/press-scale
  policy. Fine-pointer message actions appear on hover or focus-within;
  forced colors always exposes them.

## Theme precedence

Forced-colors browser mapping overrides the normal palette; keep
`forced-color-adjust: auto`. Otherwise a valid stored `stores-theme` light/dark
choice overrides the OS. Missing, system or invalid storage follows
`prefers-color-scheme`, including live changes. Initial application runs before
paint; cross-tab storage changes also update theme and browser theme-color.
No new settings control is introduced. Stored text size is independent.

## Measured contrast

Run `node qa/contrast.mjs`. This reads the actual CSS tokens, computes sRGB
relative luminance and asserts unrounded ratios. Text target is >=4.5:1;
control boundaries/focus >=3:1. Disabled controls are exempt under WCAG but
we choose >=4.5:1 for their text. Rounded values below are a token review,
not a claim that every rendered screen meets WCAG.
| Theme | Pair | Ratio | Minimum |
| --- | --- | ---: | ---: |
| Light | ink / paper | 18.88:1 | 4.5:1 |
| Light | muted / paper | 5.74:1 | 4.5:1 |
| Light | muted / paper-deep | 5.36:1 | 4.5:1 |
| Light | ink / paper-deep | 17.63:1 | 4.5:1 |
| Light | line-strong / paper | 4.54:1 | 3:1 |
| Light | line-strong / paper-deep | 4.24:1 | 3:1 |
| Light | focus / paper | 7.45:1 | 4.5:1 |
| Light | focus / paper-deep | 6.95:1 | 4.5:1 |
| Light | danger / danger-soft | 5.91:1 | 4.5:1 |
| Light | danger / paper | 6.47:1 | 4.5:1 |
| Light | disabled / paper-deep | 5.36:1 | 4.5:1 |
| Light | success / paper | 6.45:1 | 4.5:1 |
| Light | warning / paper | 6.70:1 | 4.5:1 |
| Dark | ink / paper | 18.43:1 | 4.5:1 |
| Dark | muted / paper | 5.92:1 | 4.5:1 |
| Dark | muted / paper-deep | 5.58:1 | 4.5:1 |
| Dark | ink / paper-deep | 17.37:1 | 4.5:1 |
| Dark | line-strong / paper | 5.92:1 | 3:1 |
| Dark | line-strong / paper-deep | 5.58:1 | 3:1 |
| Dark | focus / paper | 11.74:1 | 4.5:1 |
| Dark | focus / paper-deep | 11.07:1 | 4.5:1 |
| Dark | danger / danger-soft | 5.84:1 | 4.5:1 |
| Dark | danger / paper | 7.59:1 | 4.5:1 |
| Dark | disabled / paper-deep | 8.52:1 | 4.5:1 |
| Dark | success / paper | 11.63:1 | 4.5:1 |
| Dark | warning / paper | 12.21:1 | 4.5:1 |

## Design review and remaining acceptance gate

Code/design review recorded 2026-10-21: the old translucent control borders,
light focus mix, opacity-disabled controls and 4.41:1 light error pairing failed
our targets. Replaced with measured semantic tokens, opaque content surfaces,
readable disabled text and 5.91:1 error text. All measured pairs now pass.
The SDK already follows system changes but does not synchronize theme-color or
cross-tab theme changes; the startup script now handles both. The script catches
storage errors; SDK module initialization still requires readable localStorage.

Automated Chromium review covers both normal palettes, live/explicit theme
precedence, invalid/disabled/focus states, reduced motion,
forced-colors media emulation, visible actions and dialog focus restoration.
Emulation is not review of a real Windows contrast theme.

**Acceptance remains pending real theme review.** A reviewer must enable actual
Windows Aquatic, Desert, Dusk and Night sky themes in Settings > Accessibility >
Contrast themes, and record OS/browser versions, theme, date and findings here.
For each, inspect sign-in and authenticated workspace creation, channel/member
forms, message/reaction controls, thread and dialog: readable text/borders,
keyboard focus, selected state, disabled state, dashed invalid border plus error
text, visible message actions and backdrop separation. Check zoom/reflow at
200% and 400%. Resolve findings before declaring #24 complete or creating
build-ready child tasks. No real-theme review or human approval is claimed by
this implementation. E14's NVDA/VoiceOver journey gate remains separate (#26).

Production review follow-up: SDK sign-in buttons supply inline white-on-accent
colors and border:none, overriding normal component styles. The provider wrapper
now explicitly overrides those inline declarations with paper-on-focus colors
(7.45:1 light, 11.74:1 dark), and ButtonFace/ButtonText plus a solid border in
forced colors. Dedicated browser regressions cover both provider palettes.

Verification follow-up (2026-10-22): contrast regression checks now enforce
4.5:1 for focus-colored link text on both content surfaces and error text on
paper, and cover muted text on the hover/selected surface. The same focus
pairs also cover the inverse paper-on-focus sign-in buttons. These checks
previously used the 3:1 non-text threshold for colors also used as text.
Actual Windows contrast-theme review remains pending; this macOS host can
only exercise Chromium media emulation. No build-ready child tasks are created.

Local validation on 2026-10-22: `pnpm test` passed 791 SQL assertions,
35 unit/DOM tests and 26 contrast pairs; the web production build passed.
All six targeted visual browser regressions passed using cached Chromium
headless shell 1223 (media emulation only). Installed Chrome failed to launch
because its VideoToolbox dependency is unavailable on this macOS version;
Playwright's default browser revision 1248 is not installed.

The full browser suite completed with 40 passed and 11 failed. Failures cover
message/thread status selectors, member/owner labels, 503 recovery expectations
and mobile layout. All six visual tests passed within this run as well.
This follow-up changes only contrast assertions and this document; it does not
resolve those broader browser failures or claim a clean full browser suite.
