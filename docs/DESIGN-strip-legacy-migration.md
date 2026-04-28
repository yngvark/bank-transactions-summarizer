# Strip legacy migration logic, rename `migration.ts` → `boot.ts`

## Why

`v2/frontend/src/services/migration.ts` had three responsibilities tangled together: backward-compat migration of pre-existing user data, first-run init from defaults, and resilience (corruption backup + drift healing). The app has not been used for production data, so the backward-compat paths were dead weight — code, schema, and tests carrying no real value, only friction during future changes.

The remaining file is no longer "migration" in any useful sense (init + resilience), so it was renamed to `boot.ts`.

## What was removed

- **V1 SaveFile upgrade path.** The schema (`V1SaveFileSchema`, `V1CategoryNodeSchema`, `V1SaveFile` type) plus the conversion helpers (`tryUpgradeV1`, `migrateV1Categories`, `mergeEmojiIntoName`).
- **Standalone legacy-key reads.** `bts-rules-v1` (legacy text-pattern rule storage) and `theme` (legacy theme key) — readers, removers, and the constants themselves.
- **`stripCategoryEmoji`** — the v2-internal compat path that stripped a deprecated `emoji` field from category nodes and merged it into `name`. The current schema no longer accepts that field.
- **All tests** that exclusively exercised the removed paths, plus the legacy-key cleanup lines in E2E `beforeEach` setup.

## What was kept

- **`loadOrInitSaveFile`** (renamed from `runMigration`) — the boot-time entry point: load existing valid SaveFile, otherwise build a fresh one from `categories.json` and persist it.
- **`reconcileCategoriesWithMappings` / `healAndPersist`** — drift healing for the case where `categories.json` adds a primary or sub that the user's stored tree doesn't yet have. Not backward-compat; protects against future evolution of the bundled defaults.
- **`backupAndRebuild` / `SAVEFILE_BACKUP_KEY`** — corrupt-blob backup before rebuild, so a malformed localStorage state never silently destroys whatever was there.
- **`SAVEFILE_STORAGE_KEY = 'bts-savefile-v1'`** — the localStorage slot name keeps its `-v1` suffix; that's the *slot* version, not the payload version (which lives inside the JSON as `version: 2`).

## File rename

| Old | New |
| --- | --- |
| `v2/frontend/src/services/migration.ts` | `v2/frontend/src/services/boot.ts` |
| `v2/frontend/src/services/migration.test.ts` | `v2/frontend/src/services/boot.test.ts` |
| export `runMigration` | export `loadOrInitSaveFile` |

Call sites updated: `context/ConfigContext.tsx`, `services/persistence.ts`, `services/persistence.test.ts`.

## Notes for future work

If a future change to the SaveFile shape needs migration of *real* user data, the natural place to add it is back in `boot.ts` — read the stored payload, branch on `version`, upgrade as needed before validation. There is no obligation to keep the file shaped around legacy concerns until that need actually arrives.
