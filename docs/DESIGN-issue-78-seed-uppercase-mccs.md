# Issue 78 — Seed categorization for older merchant-category format

## Context

Older Bank Norwegian Excel exports use a different `merchantCategory` format
than the seeds in `v2/frontend/src/data/categories.json`. Where the newer
format produces strings like `Grocery Stores, Supermarkets` or
`Eating places and Restaurants`, the older format produces uppercase/slash
strings such as `GROCERY STORES/SUPERMARKETS`, `RESTAURANTS`,
`COMPUTER NETWORK/INFO SVCS`, `DIGITAL GOODS – LARGE DIGITAL GOODS MERCHANT`.

Seed rules match `merchantCategory` with `match: 'exact'`, so the older
strings were silently uncategorized.

## Approach (A from the issue)

Append the uppercase/slash variants directly into `categories.json`. The
boot path in `v2/frontend/src/services/boot.ts` already converts every JSON
key into a `seed-*` rule with exact match on `merchantCategory`, so no code
changes were needed.

70 unique uppercase/slash values from a real older-format Bank Norwegian
export were added; one mixed-case merchant-specific value (`Norwegian Air
Shuttle`) was included for the same reason. Total seed count grew from 56 to
126.

The category targets were chosen to mirror the closest existing seed where
one exists (e.g. `GROCERY STORES/SUPERMARKETS` → `Mat og drikke /
Dagligvarer`, matching `Grocery Stores, Supermarkets`). Mappings without a
clean parallel landed on the most plausible bucket, defaulting to
`Øvrig bruk / Øvrig bruk` when no good fit existed (e.g. `POSTAGE STAMPS`,
`COURIER SERVICES`, `REAL ESTATE AGENTS MANAGERS - RENTALS`).

## Migration

None. Per the issue, approach A only affects *fresh* SaveFiles. Existing
users keep their stored rules and will not see the new mappings unless they
clear `localStorage` (`bts-savefile-v1`) and reload, or manually edit their
SaveFile. This is acceptable for now; a migration would change semantics for
users who have intentionally customized their rules.

## Test churn

Three e2e tests hard-coded the seed count (56/57). They now derive the
count from `categories.json` at load time so future seed additions don't
break the tests:

- `v2/e2e/category-rules.spec.ts`
- `v2/e2e/savefile-roundtrip.spec.ts`

## Trade-offs considered

- **B — sibling JSON file (`categories-mcc-uppercase.json`)**: clearer
  provenance, same runtime behavior. Rejected because the existing seed
  file already mixes formats (it has both `Taxicabs and Limousines` and
  `TAXICABS/LIMOUSINES`); a second file would imply a stronger separation
  than the data has.
- **C — alias map at match time**: avoids growing the rules panel. Rejected
  for now because the panel-clutter problem is independent of this issue
  and worth addressing on its own (collapse/hide `seed-*` rules — see issue
  78's open questions).
