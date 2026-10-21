# E14 — Experience system, accessibility, mobile, and localization

**Priority:** P1
**Depends on:** E0–E5
**Goal:** Specify a coherent product for keyboard, assistive technology, small screens, and global teams.

## Tasks

- [ ] **E14.1 Establish visual system.** Meet WCAG 2.1 AA; define tokens,
  typography, spacing, contrast, visible focus, motion, density, responsive
  breakpoints, component states, `prefers-reduced-motion`,
  `prefers-color-scheme`, and high-contrast/forced-colors treatment.
- [ ] **E14.2 Finalize desktop and mobile IA.** Specify the MVP desktop
  sidebar/panes and mobile channel/workspace navigation, restoration, and deep
  links. DMs (E11), full search (E12), and personal triage/"You" (E11) may be
  designed as future navigation states, but must not appear available in an MVP
  release before their owning epic is approved.
- [ ] **E14.3 Define keyboard and command palette.** Shortcut inventory,
  discoverability, conflicts, menus, dialogs, composer, thread, and search tests.
  Specify dialog focus placement/trapping and focus restoration on close.
- [ ] **E14.4 Specify live-region behavior.** Bounded new-message announcements
  that preserve focus, reduced motion, high contrast, zoom/reflow, and touch targets.
- [ ] **E14.5 Localize deliberately.** String externalization, locale/time-zone
  precedence, dates/numbers/plurals, RTL readiness, and content-language handling.
- [ ] **E14.6 Catalogue recovery states.** Empty, permission denied, invite expiry,
  archived, offline, rate limited, pending send, and no-access states.

## Acceptance criteria

- Every P0 journey is keyboard-only and screen-reader tested with NVDA and
  VoiceOver at 200–400% zoom.
- Mobile behavior is designed independently rather than shrinking the desktop shell.
- No private/external/guest condition relies on colour alone.

## Delivery tracking (2026-10-20)

First slice: reduced-motion and forced-colors behavior, design rationale in
[experience-design.md](../experience-design.md), and browser regression coverage.
E14 remains open; none of the full task checkboxes above is complete.

Remaining design/review follow-ups (not build-ready task approvals):

- #24: E14.1 visual tokens, contrast, theme precedence, component states.
- #25: E14.2 independent mobile IA, restoration, deep links, reflow.
- #26: E14.3 keyboard contract and NVDA/VoiceOver journey validation.
- #27: E14.4/E14.6 announcements and recovery-state catalogue.
- #28: E14.5 localization, time zones, formatting, RTL and language.

Each follow-up must record its decisions and review before creating build-ready
child tasks. Automated browser checks do not complete the manual acceptance
criteria in this epic.

Issue #24 implementation decisions and measured contrast are recorded in
[visual-system.md](../visual-system.md). E14.1 remains unchecked pending the real
Windows contrast-theme review specified in that record.

## Remaining contract proposal (2026-10-21)

[Inclusive experience](../design/inclusive-experience.md) records proposed keyboard,
bounded announcement, recovery-state and localization decisions plus a test/review
matrix for #26–#28. These are proposals awaiting review; no additional task is
marked complete. Existing mobile decisions are in [mobile-navigation.md](../mobile-navigation.md).
The modal containment regression is automated coverage, not NVDA/VoiceOver evidence.

## Authorized implementation delivery (2026-10-21)

The follow-up user instruction requested actual implementation and closure after
non-browser validation, explicitly allowing Chromium tests to be skipped on this
host. The implementation now includes typed string externalization, locale/zone
and composer preferences, bounded opt-in message announcements, authorized URL
restoration, mobile recovery visibility and focus/draft recovery improvements.
See the [implementation record](../design/inclusive-experience.md#implementation-and-review-record-2026-10-21)
for behavior, executable test coverage and remaining manual review limitations.

The checkboxes above remain acceptance tracking: manual NVDA/VoiceOver, real
Windows contrast themes and real-device zoom/reflow have not been performed.
Closing the implementation issue at the user's request does not establish WCAG
conformance or complete the separate evidence in #24–#28. No new PAS resources,
future navigation capabilities or build-ready child issues were created.
