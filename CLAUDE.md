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

## Developing rules

- ✅ ALWAYS use playwright skill for verifying UI or frontend changes
- ✅ ALWAYS commit changes when done

## AI Planning Documents

Store all AI-generated planning/design docs (PLAN.md, ARCHITECTURE.md, etc.) in `history/`, not the project root.
