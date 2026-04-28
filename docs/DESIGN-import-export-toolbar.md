# Rename config toolbar to "Import" / "Export"

## Why

The header toolbar previously had two buttons labeled **Load** and **Save**. The Save button conflated two ideas: it cleared the dirty indicator (suggesting "your changes are now safe") *and* triggered a JSON file download. Users read "Save" as "persist my work to local state," but local state was already auto-saved to `localStorage` on every change — the button only ever wrote a file.

That mismatch produced confusion: clicking Save downloaded a file the user hadn't asked for, and not clicking it left a dirty dot suggesting work was at risk when it wasn't.

## What changed

- `Load` → `Import`
- `Save` → `Export`
- Dirty dot (●) stays on the Export button: it now means "you have changes that haven't been written to a file yet," which matches the button's actual job.
- The auto-save-to-localStorage behavior is unchanged. There is no manual "save" button — there is nothing to save manually.

## Why two buttons, not three

The user's instinct was Save / Import / Export. But a manual Save button would either be a no-op (auto-save already runs) or a regression (drop auto-save and risk losing work on tab close). Two buttons match what the system actually does: one path for *files in*, one path for *files out*. Auto-save stays invisible because the user shouldn't have to think about it.

## Code changes

| File | Change |
| --- | --- |
| `v2/frontend/src/components/ConfigToolbar.tsx` | Button labels, test IDs (`config-load`/`config-save` → `config-import`/`config-export`), aria-labels, confirmation prompt copy |
| `v2/frontend/src/context/ConfigContext.tsx` | `saveToFile` → `exportToFile`, `loadFromFile` → `importFromFile`; persistence-module imports aliased to avoid name shadowing |
| `v2/frontend/src/context/useConfig.ts` | Context interface renamed accordingly |
| `v2/e2e/savefile-roundtrip.spec.ts` | Test IDs and narration updated |
| `v2/e2e/user-stories.spec.ts` | New corpus story: "I can export my configuration to a file and import it back later" |

## Dirty-state semantics

`isDirty` still compares `fingerprint(currentConfig)` to `lastSavedFingerprint`, where `lastSavedFingerprint` updates on import or export. The flag now reads as: "the on-disk file copy is out of date." That is what the dirty dot on Export communicates.
