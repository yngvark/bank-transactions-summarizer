# Design: filter transactions by category (any hierarchy level)

## Problem

The transactions list in `v2/frontend/src/components/TransactionsTable.tsx`
could only be narrowed by free-text search and a date range. There was no way
to scope the list to a specific category — a common analysis question ("show me
just my food spending"). Because `tx.Category` is stored as a `' ➡ '`-joined
string (e.g. `"Mat og drikke ➡ Restauranter og barer"`) and categories form a
recursive tree (`CategoryNode` in `v2/shared/types.ts`), the filter had to work
at any level: clicking a primary should include all of its descendants.

## Approach

A new pure utility, `transactionMatchesCategoryFilter` in
`v2/frontend/src/services/categoryFilter.ts`, decides membership using the same
`' ➡ '` separator that already lives in `services/rules.ts` and
`services/categoryTree.ts`. Membership is segment-based: a category matches
when it equals the selected joined path or starts with `<path> + ' ➡ '`. The
separator boundary stops a string-prefix match from misfiring (e.g. selecting
`"Mat"` must not match `"Mat og drikke"`).

`App.tsx` holds a single `selectedCategory: string | null`. The existing
`filteredTransactions` (text + date filtered) is left untouched so that
`calculateStatistics()` keeps producing the full breakdown. A new
`displayedTransactions` memo applies the category filter on top, and is what
the transactions table renders. This split is the core of the UX decision
below.

## UX choices

The user picked these (all alternatives explored before implementation):

1. **Activation: per-row filter icon in the Spending-by-Category table.**
   A small funnel-SVG button is rendered next to each category name in view
   mode. Clicking it sets the filter; clicking the same row's icon again
   clears it (toggle-off). The button calls `e.stopPropagation()` so it
   doesn't conflict with the existing chevron-toggles-expand behaviour on
   parent rows. The button is hidden in edit mode where the row already hosts
   add/delete/drag affordances.
2. **Scope: transactions list only.** The statistics table keeps showing
   sibling categories so users can compare while inspecting one category.
   This is why `filteredTransactions` (statistics input) and
   `displayedTransactions` (list input) are kept separate.
3. **Composition: AND with text search and date range.** Each filter is
   independent state. Typing in the search box narrows whatever the category
   filter has already left visible.
4. **Persistence: none.** The filter resets on page refresh, mirroring the
   existing text-search and date inputs (which are also non-persistent). No
   new localStorage key.

## UI bits

- `.cat-filter-btn` (in `v2/frontend/src/styles/index.css`, near
  `.cat-content`): subtle by default, full opacity on hover/focus/active.
  `aria-pressed` reflects the active state for screen readers.
- `.category-filter-pill` (near `.loaded-file-pill`): chip rendered above the
  transactions table when a category is active, with a `×` clear button
  (`data-testid="category-filter-clear"`).
- The pill displays the joined path verbatim (e.g.
  `"Mat og drikke ➡ Restauranter og barer"`), matching how categories appear
  in transaction rows. No re-formatting.

## Why no `useMemo` on the filter call site

The filter callback in `App.tsx` is passed inline to `StatisticsTable`. It
captures `setSelectedCategory` (stable) and uses functional form, so it does
not stale-close. A wrapped `useCallback` would add noise without measurable
benefit at this scale.

## Test IDs

- `cat-filter-${indexPath}` — per-row filter button (one per row in view mode).
- `category-filter-pill` — active filter chip.
- `category-filter-clear` — `×` button on the pill.

## Verification

- Unit tests: 8 cases in `v2/frontend/src/services/categoryFilter.test.ts`
  cover exact match, descendant, deep descendant, sibling primary, sibling
  sub-category, partial-segment prefix (the "Mat" / "Mat og drikke" trap),
  unknown category, and the empty-selection no-op path.
- E2E: `v2/e2e/user-stories.spec.ts` gains "I can filter the transactions
  list to only show one category" — selects a primary, asserts the pill
  appears, asserts each remaining row matches the path or its descendants,
  asserts a sibling primary remains visible in the statistics table, and
  asserts the `×` clears the filter and restores the original row count.
- `make ci` runs both. After this change: 125 unit tests (was 117) and
  70 e2e tests (was 69) all passing.
