# Pending ("Reservert") Bank Norwegian Transactions

## Context

Bank Norwegian Excel exports include rows for transactions that have been authorized
but not yet settled. These rows have `Type = "Reservert"` and the three date columns
(`TransactionDate`, `BookDate`, `ValueDate`) are **empty**.

Before this change, the parser assumed every row had a parseable date. A Reservert
row would either become a `Transaction` with `undefined` date fields (violating the
type) or silently drop out of date-range filters (`new Date(undefined)` is
`Invalid Date`; all comparisons return `false`). The `d3.rollup` month aggregation
called `.getFullYear()` on the missing date and crashed.

## Handling rules

1. **Detection**: A row is pending iff `Type === "Reservert"`. Missing date alone
   is not treated as pending (no other bank format currently omits dates).
2. **List view**: Reservert rows are kept in the transaction list with a blank
   date cell. The `Type` column already shows "Reservert", which is the user-facing
   signal.
3. **Date-range filter**: Reservert rows pass through the filter unchanged — they
   are never hidden by period selection because they have no date to compare.
4. **Monthly heatmap / statistics**: Reservert rows are excluded from aggregation.
   Their amounts do not appear in any month column, category sum, footer, or
   category tree total. This avoids mixing authorized-but-unsettled amounts with
   real monthly spend.
5. **Types**: `RawTransaction` and `Transaction` date fields are `… | null`.
   `calculateStatistics` narrows to `Date` after filtering out null-date rows.

## Out of scope

- Visual styling for pending rows (no italic / distinct background).
- Sorting pending rows to the top. Current impl preserves file order.
- Missing-date-only detection (user confirmed: `Type === "Reservert"` only).

## Verification

Run `make ci` from the repo root. The relevant coverage:

- `v2/frontend/src/services/parser.test.ts` — three inline cases (null dates,
  mixed rows, undefined dates) + two fixture-based cases asserting that
  Reservert rows parse to null dates.
- `v2/frontend/src/services/statistics.test.ts` — three cases: `yearMonths`
  excludes Reservert rows, Reservert amount absent from all sums, all-Reservert
  input does not crash.
- `v2/e2e/xlsx-import.spec.ts` — Pending row text visible in list; month
  columns remain exactly `['2023-03', '2023-04']`; pending amount `-299` does
  not appear anywhere in the statistics table.
