## Project Overview

Bank Transactions Summarizer — a frontend-only SPA for personal finance analysis. Users upload bank transaction Excel files, which are auto-categorized and displayed as monthly spending statistics with color-coded heatmaps. No backend or database; all processing is client-side. Live at https://yngvark.github.io/bank-transactions-summarizer/.

**Tech stack:** TypeScript, React 18, Vite 6, D3.js (aggregation), SheetJS (Excel parsing), plain CSS, Playwright (E2E tests), GitHub Pages (deployment via GitHub Actions).

**Data flow:** Excel upload → SheetJS parse → filter by text/date → categorize via `v2/frontend/src/data/categories.json` (36 merchant→Norwegian category mappings) → D3 rollup by month+category → render statistics heatmap table + transaction list.

**Key layout:**
- `v2/frontend/src/` — React app (App.tsx, components/, services/, data/, styles/)
- `v2/shared/types.ts` — shared TypeScript types (RawTransaction, Transaction, CategoryMapping, GroupedStatistics)
- `v2/e2e/` — Playwright E2E tests
- `.github/workflows/` — CI/CD (deploy.yml, playwright.yml)
- `history/` — AI-generated design/planning docs

**Key features:** Excel drag-and-drop upload, auto-categorization, red/green heatmap statistics table, text search + date range filtering, sample data generator (500 transactions), adjustable display settings (text size, cell spacing), mobile responsive, sticky headers/columns.

## Development loop

Verify changes locally with `make ci` (runs unit + E2E tests). Do NOT run `npx playwright` or `pnpm run test:e2e` directly.

GitHub CI is slow. Use `make ci` as the main verification method. Only check GitHub CI once all local work is complete — this keeps the feedback loop fast.

## Running the dev server (agents only)

Prefer `make ci` for verification — it does not need a long-lived dev server. If you must run the dev server (e.g. interactive UI poking), use the tracked targets:

- Start: `make run-bg` — starts Vite detached in its own session (`setsid`), writes PID to `/tmp/bts-dev.pid`, log to `/tmp/bts-dev.log`.
- Stop: `make stop` — kills the tracked PID's process group; falls back to `fuser` on the port if no PID file is present.
- Tail: `tail -f /tmp/bts-dev.log`.

NEVER use `lsof -ti:PORT | xargs kill` from a Bash tool invocation. On environments where `lsof` is busybox (no `-ti` support), the command outputs garbage PIDs and `xargs kill` then signals random processes, including Claude Code itself (issue #68). Always kill by PID, or use `fuser PORT/tcp PORT/tcp6 -k`.

## Pull requests

- ✅ ALWAYS include screenshots in PR descriptions. Put them in `screenshots/` at repository root.
