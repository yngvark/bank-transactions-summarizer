# Design: Data Persistence and Category Management Infrastructure

## Problem

Categories are static (`categories.json`, 36 merchant-code mappings). No way to edit categories from the UI. No persistence of user changes. Uncategorized transactions are a dead end.

The prototype (`../prototypes/prototype-d-inline-sortable.html`) demonstrates inline category editing with text-pattern rules and localStorage persistence, but needs a proper data architecture before integration.

## Data Model

Single `SaveFile` JSON structure holds all user state:

```typescript
interface SaveFile {
  version: 1;
  categories: CategoryTree;
  rules: {
    merchantCodeMappings: Record<string, [string, string]>;
    textPatternRules: TextPatternRule[];
  };
  settings: {
    theme: 'light' | 'dark';
    density: string;
  };
}

interface CategoryTree {
  [primaryName: string]: {
    emoji?: string;
    subcategories: string[];
  };
}

interface TextPatternRule {
  id: string;
  type: 'substring' | 'regex';
  pattern: string;
  category: [string, string]; // [primary, sub]
}
```

`CategoryTree` is the single source of truth for what categories exist. Both rule types reference categories from this tree.

A JSON Schema validates the `SaveFile` structure on every load (from file or localStorage).

## Categorization Priority

1. Text-pattern rules (first match wins, checked in array order)
2. Merchant-code mappings (current behavior, lookup by `Merchant Category` field from Excel)
3. `"Ukjent kategori"` fallback

Merchant-code mappings are the automatic baseline. Text-pattern rules are user overrides with higher priority.

## Persistence Model

Two layers, like "auto-save draft + explicit Save" in desktop apps:

- **localStorage**: auto-synced on every config change. Working draft. Survives browser close/reopen.
- **JSON file**: explicit Save/Load by user. The "real save."
  - Save: downloads `bank-config.json` via `<a download>`
  - Load: file picker, validates against JSON Schema, replaces config
- **Dirty tracking**: "dirty" = config differs from last file save (not localStorage). `beforeunload` fires when dirty. Visual indicator on Save button.
- **Bootstrap**: on first load with no localStorage, migrate `categories.json` into the new format.

## State Management

React Context with dedicated hooks. No external state libraries.

```
main.tsx
  └── <ConfigProvider>
        └── <App>
              ├── useConfig() hook for config read/write
              ├── useState for transient data (transactions, filters)
              └── components...
```

ConfigContext provides: `config`, mutators (`updateCategories`, `addRule`, `removeRule`, `updateSettings`), `isDirty`, `saveToFile()`, `loadFromFile()`.

## Scope

This design covers **infrastructure + minimal UI** (Save/Load buttons). The inline category editing dropdown from the prototype is deferred to a follow-up.

## Files

New:
- `v2/frontend/src/context/ConfigContext.tsx` -- provider + useConfig() hook
- `v2/frontend/src/services/categorizer.ts` -- pure categorization function
- `v2/frontend/src/services/persistence.ts` -- localStorage sync, file I/O, dirty tracking, beforeunload
- `v2/frontend/src/services/migration.ts` -- one-time categories.json to SaveFile conversion
- `v2/frontend/src/schemas/savefile.schema.json` -- JSON Schema for validation

Modified:
- `v2/shared/types.ts` -- new type definitions (SaveFile, CategoryTree, TextPatternRule)
- `v2/frontend/src/main.tsx` -- wrap with ConfigProvider
- `v2/frontend/src/App.tsx` -- use useConfig() instead of static categories import
- `v2/frontend/src/services/parser.ts` -- use new categorizer
- `v2/frontend/src/components/DisplaySettings.tsx` -- delegate persistence to config
