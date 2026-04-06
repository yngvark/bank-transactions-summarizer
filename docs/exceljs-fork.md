# ExcelJS Fork: Fix for tableRef Crash

## Problem

`@protobi/exceljs@4.4.0-protobi.9` crashes when loading certain `.xlsx` files (e.g. bank statement exports) with:

```
TypeError: Cannot read properties of undefined (reading 'tableRef')
```

The crash occurs in `lib/doc/worksheet.js` inside the `model` setter, where `value.tables.reduce()` iterates over a tables array that can contain `undefined` entries from sparse Excel table definitions.

## Decision

Fork `protobi/exceljs` to `yngvark/exceljs` and apply a one-line fix: a null guard (`if (!table) return tables;`) at the top of the reduce callback.

### Why fork instead of pnpm patch?

- Makes the fix visible and traceable in a separate repo
- Allows contributing the fix back upstream if protobi/exceljs accepts PRs
- The fork also includes the built `dist/` directory (which the upstream repo `.gitignore`s), enabling direct GitHub dependency references without a build step

### Why not wait for upstream fix?

- `protobi/exceljs` is itself a fork of `exceljs/exceljs` and appears to have infrequent maintenance
- The fix is trivial and low-risk

## Implementation

1. Forked `protobi/exceljs` to `yngvark/exceljs`
2. Added null guard in `lib/doc/worksheet.js` line 1003
3. Built `dist/` and committed it (upstream only publishes dist to npm, not to git)
4. Updated both `v2/frontend/package.json` and `v2/package.json` to point at the fork via commit hash

## References

- Issue: yngvark/bank-transactions-summarizer#49
- Fork: yngvark/exceljs
- Fix commit: yngvark/exceljs@658267d
