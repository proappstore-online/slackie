# E14 — Experience system, accessibility, mobile, and localization

**Priority:** P1
**Depends on:** E0–E5
**Goal:** Specify a coherent product for keyboard, assistive technology, small screens, and global teams.

## Tasks

- [ ] **E14.1 Establish visual system.** Tokens, typography, spacing, contrast,
  focus, motion, density, responsive breakpoints, and component states.
- [ ] **E14.2 Finalize desktop and mobile IA.** Desktop sidebar/panes, mobile
  Home/Activity/DMs/Search/You, navigation restoration, and deep links.
- [ ] **E14.3 Define keyboard and command palette.** Shortcut inventory,
  discoverability, conflicts, menus, dialogs, composer, thread, and search tests.
- [ ] **E14.4 Specify live-region behavior.** Bounded new-message announcements
  that preserve focus, reduced motion, high contrast, zoom/reflow, and touch targets.
- [ ] **E14.5 Localize deliberately.** String externalization, locale/time-zone
  precedence, dates/numbers/plurals, RTL readiness, and content-language handling.
- [ ] **E14.6 Catalogue recovery states.** Empty, permission denied, invite expiry,
  archived, offline, rate limited, pending send, and no-access states.

## Acceptance criteria

- Every P0 journey is keyboard-only and screen-reader tested at 200–400% zoom.
- Mobile behavior is designed independently rather than shrinking the desktop shell.
- No private/external/guest condition relies on colour alone.
