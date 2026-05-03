# Issue #37: Faster date range selection (alternative D)

## Problem

Selecting a date range with the two native HTML date pickers takes
several clicks per input — the user navigates to a specific month,
then a specific day, then repeats for the second bound. Most ranges in
this app are calendar-month boundaries (e.g. "all of Q1 2024"), so
day-precision input is cumbersome for the common case.

Issue #37 enumerated four candidate UX directions and pointed at
interactive prototypes under `history/` (only `prototype-d` was kept
in the repo by the time this work landed). This change implements
**alternative D — Year tabs + month grid**.

## Decision

Picker layout, top to bottom:

1. Existing `From` / `To` date inputs (kept verbatim — day-precision
   adjustment is still occasionally useful).
2. A row of year tabs, one per year present in the loaded data.
3. A 6-column × 2-row month grid for the selected year tab.
4. A textual summary of the active or in-progress range
   (`"Mar 2023 – Aug 2023"`).

Interaction:

- Click a month → that month becomes the **anchor** (a single accent
  cell). The committed range is unchanged until the second click.
- Hover after anchoring → preview band between anchor and hover.
- Click a second month → range is committed; `From` is set to the 1st
  of the earlier month, `To` to the last day of the later month.
- The user can switch year tabs mid-pick to define cross-year ranges.
- `Esc` while mid-pick clears the anchor.
- Editing `From` / `To` directly retargets the active year tab and
  re-renders the grid.

## Why D over A/B/C

- **A — Quick presets** (1M, 3M, …, YTD): fast for a few canned ranges
  but doesn't help with arbitrary month ranges, which are common when
  exploring categorized spending across a quarter or half-year.
- **B — Clickable statistics-table headers**: zero extra UI, but turns
  every accidental header click into a range edit, and depends on the
  stats table being visible — it isn't, before any data is loaded.
- **C — Visual month strip**: works for short ranges but scales
  poorly across years (horizontal scrolling).
- **D**: handles the common case (one or a few months in a single
  year) in two clicks, supports cross-year ranges via tab-switch,
  and remains discoverable next to the existing inputs.

## Implementation

- `MonthRangePicker.tsx` (new) owns the picker UI and the anchor /
  hover state. It exposes the committed range via
  `onRangeChange(fromYYYYMMDD, toYYYYMMDD)`.
- `SearchControls.tsx` mounts the picker below the existing `From` /
  `To` inputs and bridges `onRangeChange` to the existing two
  callbacks. No other components see the picker.
- `App.tsx` derives `availableYears` from the loaded transactions
  (union of `TransactionDate` and `BookDate` years) and passes it
  down. If no year is observed the picker falls back to the current
  year so it never renders an empty tablist.
- The grid uses `data-state="edge"|"in-range"|"preview"|"idle"` on
  each cell, both as a styling hook and so the E2E spec can assert
  state without inspecting class names.
- Styles live alongside the existing date-input styles in
  `index.css`. Light-theme palette mirrors the prototype; dark theme
  swaps the in-range / preview fills for translucent accent
  variants.

## Verification

- Unit tests: 125 pass (no new unit tests; the component's logic is
  thin enough that the user-story E2E covers the contract.)
- E2E: new user story `I can pick a date range by clicking two months
  in the picker grid` in `e2e/user-stories.spec.ts`. Asserts that two
  clicks update `From`/`To` to the first/last day of the picked
  months and that the period summary reads the chosen range.
- Manual: light + dark theme screenshots attached to the PR; default,
  hover-preview, and committed-range states all render as designed
  on a 1280×900 viewport.

## What this change does *not* do

- No mobile-specific layout: the 6×2 grid is already narrow enough to
  fit on a phone, and on small viewports the existing
  `period-fields-wrapper` mobile rules continue to apply to the
  `From`/`To` inputs above. If the year-tabs row ever overflows on
  very narrow phones we can revisit, but no current viewport in the
  E2E matrix shows clipping.
- No keyboard navigation across cells (Tab still works; arrow-key
  grid traversal is out of scope for this issue). The native date
  inputs above remain the keyboard-first path.
- No persistence of picker state — the persisted state is the
  `From`/`To` dates already wired through the rest of the app, and
  the picker derives its display from those.
