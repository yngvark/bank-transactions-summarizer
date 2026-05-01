# Design: sortable columns in TransactionsTable

## Problem

The transactions table (`v2/frontend/src/components/TransactionsTable.tsx`) had
sort affordance on a single column — Category — added when category editing
was introduced. The other five columns (Date, Text, Type, Amount, Merchant
Category) rendered as plain `<th>` elements with no way to reorder. For
exploratory analysis ("show me my biggest expense", "what did I spend at
ESPRESSO HOUSE?") users had to scroll the unsorted feed or use the search
box. Once one column was sortable, parity across the rest was the obvious
next step.

## Approach

Generalise the existing single-column sort state to a
`{ key: SortKey; dir: SortDir }` pair, and make every header click `toggleSort(key)`.
Cycle is preserved from the existing pattern: idle → asc → desc → idle. Switching
to a different column starts fresh at asc.

A single `compare(a, b, key)` function dispatches by column type:

- **Date columns** (`TransactionDate`, plus the unused `BookDate`/`ValueDate`)
  compare on `getTime()`. Pending rows have `null` dates and always sink to the
  bottom regardless of direction — pending rows at the top would imply they
  belong before all booked rows, which they don't.
- **Numeric columns** (`Amount`) use plain subtraction.
- **String columns** use `localeCompare(_, 'nb')` to match the Norwegian sorting
  the existing Category column already used.

CSS reuses `.sortable`, `.sort-asc`, `.sort-desc`, `.sort-icon` (already in
`v2/frontend/src/styles/index.css`). Sort icon is ▲/▼ when active, ⇕ otherwise.

## Test IDs

The Category header keeps `data-testid="category-sort-header"` so the
existing test (`v2/e2e/category-rules.spec.ts:131`) is unmodified. New
columns use `data-testid="sort-header-${key}"` (e.g. `sort-header-Amount`).
The dual-naming trades a slight inconsistency for zero churn on the existing
spec; a future cleanup could converge on the new pattern.

## Out of scope

`StatisticsTable` (the spending-by-category heatmap) is hierarchical with
expand/collapse subtrees — sortable column headers there would need to
decide whether sorting reorders only top-level categories, recurses into
subtrees, or breaks the tree entirely. That is a much larger design
question and was deferred. The user's wording ("the table") and the
existing partial sort on TransactionsTable made the transactions table the
intended target.

## Verification

`make ci` runs unit tests (109 passing) and Playwright e2e (66 passing,
28 mobile-skipped per existing convention). The e2e suite gained a
parameterised loop covering the five new columns; each click cycle
(idle → ▲ → ▼ → idle) is asserted.
