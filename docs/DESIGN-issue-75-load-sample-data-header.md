# Move "Load Sample Data" button to top-right header

Issue: #75

## Context

The "Load Sample Data" button was rendered inside `SearchControls` next to
the search input. The button is a developer/demo affordance — it generates
500 random transactions and replaces the loaded data — not a search action.
Placing it next to the search box conflated two unrelated concerns.

The app header already hosts the top-right "meta" cluster (`ConfigToolbar`
with *Import config* / *Export config*), which is the natural home for
utility actions that operate on the whole app state.

## Change

- Removed the button and its `onRandomize` prop from
  `v2/frontend/src/components/SearchControls.tsx`.
- Added the button into the header in `v2/frontend/src/App.tsx`, wrapped
  with `ConfigToolbar` inside a new `.app-header-actions` flex container.
- Reused the existing `config-toolbar-button` class so the button matches
  the visual style of the surrounding header buttons (translucent on the
  dark gradient).
- Removed the now-unused `.randomize-button` CSS rules.

## Why this placement

Considered four placements (see one-shot log entry Q1):

- **A) Inside the header, grouped with ConfigToolbar** — chosen.
- B) Header far right, separate cluster — adds a new layout primitive for
  no clear benefit.
- C) Fixed overlay — introduces a positioning pattern not used elsewhere.
- D) Top-right of `controls-section` — still mixes the button with
  search/upload concerns.

A keeps existing conventions and adds no new positioning primitives.

## Verification

- `make ci` — 125 unit + 42 Playwright tests pass.
- Manual: loaded the page in the dev server, clicked the button in the
  header, confirmed 500 random transactions load and the file pill shows
  `random-data.xlsx · 500 tx`.
- Existing E2E tests select the button by text (`button:has-text("Load
  Sample Data")`), so they continue to pass after the move.

Screenshot: `screenshots/issue-75-load-sample-data-top-right.png`.
