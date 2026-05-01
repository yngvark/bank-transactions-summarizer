# Transaction persistence and Import/Export clarity

## Why

Users were reporting a "critical bug": upload an Excel file, click **Export**, refresh the page, then **Import** the just-exported JSON — and nothing visible would happen.

The root cause was not a code defect. By design (`DESIGN-import-export-toolbar.md`, `DESIGN-data-persistence.md`), the toolbar's **Import / Export** round-trips configuration only — categories, rules, settings — never transactions. The user's Excel data lived solely in React state and was wiped on refresh. Re-importing the JSON correctly replaced config with the same config that had auto-restored from `localStorage`, so the screen stayed empty. No error, because nothing failed.

Two distinct things contributed to the confusion:

1. **Refresh wiped transactions.** The user's working data vanished, with no path to get it back short of re-uploading the original file.
2. **Import/Export labels did not signal "config only".** Users naturally assumed Export saved everything they had on screen.

## What changed

1. **Transactions persist to `localStorage`** under a new key `bts-transactions-v1`, alongside the source filename. The next page load restores both — refresh no longer wipes data.
2. **A small filename pill** (`📄 file.xlsx · N tx`) renders above the statistics so the user knows which dataset is currently in view.
3. **Toolbar labels are now `Import config` / `Export config`** with corresponding aria-labels.
4. **Successful imports show a toast.** When transactions are loaded: "Configuration imported." When they are not: "Configuration imported. Upload an Excel file to see transactions." This kills the silent-success failure mode entirely.

## Why these tradeoffs

- **Why not put transactions in the export file?** Configuration is non-sensitive and shareable (the same categories/rules apply to anyone). Bank transactions are personal financial data; embedding them in a file the user might forward, attach, or commit by accident is a privacy regression. Keeping the two layers separate matches the existing architectural split.
- **Why `localStorage` and not IndexedDB?** A typical user's transaction set fits comfortably in `localStorage` (≈25k transactions before the ~5 MB ceiling becomes a concern). The save/load API is synchronous, which simplifies the React boot path. If size becomes a real problem we can swap implementations behind the same `transactionPersistence` interface.
- **Why a pill above the data, not in the upload box?** The upload box already shows the filename, but it is at the top of the page and out of view once the user scrolls into the table. The pill anchors *what is currently rendered* near the data itself.
- **Why version the storage payload?** `{ version: 1, fileName, savedAt, transactions }` lets us evolve the shape later (e.g., add multiple datasets) without breaking older data on someone's machine. Mismatched versions are dropped on load — fail open, never crash.

## Files

New:
- `v2/frontend/src/services/transactionPersistence.ts` — `saveTransactions` / `loadTransactions` / `clearTransactions`.
- `v2/frontend/src/services/transactionPersistence.test.ts` — round-trip, corrupt JSON, version mismatch, quota errors.
- `v2/frontend/src/components/LoadedFilePill.tsx` — the pill component.

Modified:
- `v2/frontend/src/App.tsx` — restore on mount, persist on upload/randomize, render the pill, pass `onSuccess` to the toolbar.
- `v2/frontend/src/components/ConfigToolbar.tsx` — relabel buttons, add `onSuccess` callback.
- `v2/frontend/src/styles/index.css` — pill styling.
- `v2/e2e/user-stories.spec.ts` — new story for refresh persistence; updated story for import toast.
