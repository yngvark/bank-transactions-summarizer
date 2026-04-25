# Design: SaveFile persistence infrastructure (issue #56)

## Why this exists

Prototype D rules (PR #36) shipped with two ad-hoc `localStorage` keys
(`bts-rules-v1` and `theme`) and component-local `useState` for rules,
density, and theme. This was a deliberately scoped first cut.

`docs/DESIGN-data-persistence.md` outlined the larger vision: a single
`SaveFile` JSON containing categories + rules + settings, auto-saved to
`localStorage`, exportable to a JSON file, validated on every load. Issue
#56 (acceptance checklist in `docs/ISSUE-savefile-infrastructure.md`)
tracked the deferred work. This doc captures what was built.

## What changed

- A unified `SaveFile` type and a runtime schema (zod) replace the ad-hoc
  `bts-rules-v1` + `theme` keys.
- `ConfigProvider` wraps `<App>` and exposes `useConfig()`. Rules, theme,
  density, categories, and merchant-code mappings all flow through it.
- One-time migration imports legacy `bts-rules-v1` and `theme` into the new
  `bts-savefile-v1` localStorage key, and seeds it from
  `data/categories.json`.
- `ConfigToolbar` adds Save / Load buttons to the app header. Save
  downloads `bank-config-YYYYMMDD-HHmmss.json`. Load opens a file picker,
  validates the JSON, and replaces the in-memory config (showing a Toast on
  validation failure).
- Dirty tracking compares the current config fingerprint against the last
  *file* save (not localStorage save, which always reflects the latest
  state). When dirty, the Save button shows a `●` indicator and a
  `beforeunload` listener warns the user about leaving the page.

## Decisions and trade-offs

### Validation: zod over hand-rolled JSON Schema

The original design called for JSON Schema (`savefile.schema.json` +
`ajv`). We chose zod 4 instead:

- single source of truth — TS types and runtime validation in one schema,
- no separate `.schema.json` file to drift against the TypeScript types,
- error messages out of the box (used directly in the load-error toast).

The trade-off is bundle weight (~30KB gzipped) and a soft dependency on a
non-standard schema format. Worth it for this codebase's size.

### `SaveFile` becomes the runtime data source

Two options were on the table:

- **Minimal wiring**: store SaveFile but keep `parser.ts` reading from the
  static `categories.json` import.
- **Full wiring**: migration imports `categories.json` into
  `SaveFile.rules.merchantCodeMappings`; `parser.ts` reads from that.

We chose full wiring. Otherwise SaveFile would be dead weight — a parallel
structure that nothing reads. With full wiring, the foundation is in place
for in-app category editing without another refactor; future edits to the
category tree or merchant mappings flow through the same context.

### Dirty = differs from last *file* save (not localStorage save)

LocalStorage is the auto-saved working draft, like an unsaved file in a
desktop editor. The "real save" is the JSON file the user explicitly
exports. Dirty tracking compares to the last file save so the indicator
reflects what the user would lose if they did nothing.

### Save/Load button placement: app header, top right

The header matches the "File menu" convention from desktop apps; the
buttons are always visible. DisplaySettings stays focused on display
concerns (density, theme) — config persistence is a different action.

### Single `localStorage` key (`bts-savefile-v1`)

Everything lives in one key. Atomic writes; no partial-state hazard from a
crash mid-update across multiple keys.

## Files

### New

- `v2/frontend/src/schemas/savefile.ts` — zod schema + `validateSaveFile`.
- `v2/frontend/src/services/migration.ts` — `runMigration()` reads or
  builds the SaveFile, removes legacy keys after a successful build.
- `v2/frontend/src/services/persistence.ts` — `loadFromLocalStorage`,
  `saveToLocalStorage`, `exportToFile` (`<a download>`), `importFromFile`,
  `fingerprint`.
- `v2/frontend/src/context/ConfigContext.tsx` — `<ConfigProvider>` and
  `useConfig()`. Owns `lastSavedFingerprint` and the `beforeunload`
  listener.
- `v2/frontend/src/components/ConfigToolbar.tsx` — Save / Load buttons +
  hidden file input for Load. Renders the dirty indicator.

### Modified

- `v2/shared/types.ts` — added `SaveFile` and `CategoryTree`.
- `v2/frontend/src/main.tsx` — wraps `<App>` in `<ConfigProvider>`.
- `v2/frontend/src/App.tsx` — reads rules, density, and merchant-code
  mappings from `useConfig()` instead of `useState` and the static
  `categories.json` import.
- `v2/frontend/src/components/DisplaySettings.tsx` — reads/writes theme
  and density via `useConfig()` and `updateSettings`. The component no
  longer touches `localStorage` directly.
- `v2/frontend/src/services/rules.ts` — removed `RULES_STORAGE_KEY`,
  `loadRules`, `saveRules` (now handled by `persistence.ts` and the
  context). Matching/applying helpers unchanged.
- `v2/frontend/src/styles/index.css` — flex layout for `.app-header`;
  styles for `.config-toolbar`, `.config-toolbar-button`,
  `.config-dirty-dot`.

## Migration semantics

```
runMigration():
  if localStorage[bts-savefile-v1] exists and validates: return it
  else build a fresh SaveFile from:
    - bts-rules-v1 → rules.textPatternRules (drop if not an array)
    - theme       → settings.theme (default 'light' if absent or unknown)
    - categories.json → rules.merchantCodeMappings
                      + categories (derived: group [primary, sub] tuples
                                    by primary, dedupe + sort sub)
    - settings.density: default 'normal'
  persist to bts-savefile-v1
  remove bts-rules-v1 and theme keys
  return the new SaveFile
```

The migration is idempotent: a second call with a valid stored SaveFile
returns it unchanged (no clobber). A stored SaveFile that fails schema
validation is rebuilt — this loses the user's *malformed* state, but
preserves whatever legacy keys still exist.

## Tests

- Unit (vitest):
  - `schemas/savefile.test.ts` — zod accept + reject paths, error path
    quality.
  - `services/migration.test.ts` — fresh install, legacy rules carry-over,
    legacy theme carry-over, idempotency, corrupt JSON, schema-invalid
    stored file, unknown theme value, derived `CategoryTree`.
  - `services/persistence.test.ts` — localStorage round-trip, fingerprint
    stability, `importFromFile` valid + invalid paths.
- E2E (Playwright, `e2e/savefile-roundtrip.spec.ts`):
  - Toolbar visible in header.
  - Migration on first load + legacy-key migration + cleanup.
  - Save → modify → Load round-trip.
  - Invalid file load → toast.

## Out of scope

- UI for editing categories or merchant-code mappings. The data structures
  are in place; a follow-up issue can build the UI on top.
- Schema migrations beyond `version: 1`. The validator rejects unknown
  versions today.
- Multi-file or cloud sync. Save/Load is single-file, local only.
