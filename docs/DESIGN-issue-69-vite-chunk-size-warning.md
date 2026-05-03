# Issue #69 — Vite chunk-size warning

## Context

`make ci` produced this warning during `vite build`:

```
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

## Build profile (before any change)

| Chunk | Raw | Gzip |
| --- | --- | --- |
| `index-*.js` (app + React + d3) | 342 kB | 106 kB |
| `exceljs.min-*.js` | **1 070 kB** | 295 kB |
| `index-*.css` | 33 kB | 6 kB |

Only the ExcelJS chunk exceeds the 500 kB default. `index.js` — including
React 19 and d3 — fits comfortably under the threshold.

## Why ExcelJS is not on the critical path

`@protobi/exceljs` is dynamically imported, so Rolldown emits it as a
standalone chunk that the browser fetches only when the user drops an Excel
file:

```ts
// src/components/FileUpload.tsx
const ExcelJS = await import('@protobi/exceljs');
```

Consequences:

- First paint never blocks on the ExcelJS chunk.
- A user who only browses the UI (no upload) never downloads the 1 MB.
- The `index.js` chunk that *does* load on first paint is 342 kB raw / 106 kB
  gzipped — well within budget for a SPA.

## Decision

**Raise `build.chunkSizeWarningLimit` to 1100 kB** in `vite.config.ts` and
keep the lazy-loading as the actual perf mechanism. Add an inline comment
that points to this document.

## Why not the alternatives

- **Replace ExcelJS with a smaller library (e.g. SheetJS).** ExcelJS supports
  more workbook features (styles, formulas) than SheetJS' free build, and the
  fork (`@protobi/exceljs`) is the result of earlier work on this repo. A
  swap would risk parsing regressions on real bank exports for a saving the
  user never feels (the chunk is lazy).
- **Split ExcelJS internally via `manualChunks`.** The library is one
  cohesive unit; cutting it apart would require forking it further or
  excluding features the parser uses. High effort, fragile, marginal
  payoff — the lazy chunk is essentially the whole library.
- **Leave the warning in place.** It would re-surface on every CI run and
  train future readers to ignore Vite warnings, masking real regressions.

## Acceptance check

`pnpm run build` no longer prints the chunk-size warning. The transaction
upload still loads ExcelJS lazily on demand (no behavioural change).

## If the threshold matters again

If `index.js` itself ever crosses 500 kB (e.g. by switching off d3 lazy
boundaries, adding charting libs, etc.), revisit by:

1. Inspecting the bundle (`pnpm exec vite build --debug` or a visualizer).
2. Lazy-loading the offending module rather than raising the limit further.

The 1100 kB ceiling is set just above the current ExcelJS chunk on purpose:
if the lazy chunk grows further we want a fresh review, not silent drift.
