# Issue: SaveFile persistence infrastructure (follow-up to prototype D)

## Context

`docs/DESIGN-data-persistence.md` designed a full persistence layer for user
state: a single `SaveFile` JSON structure containing categories, rules, and
settings; localStorage auto-save; explicit Save/Load file I/O; JSON Schema
validation; dirty tracking with `beforeunload`. The first iteration of the
rules feature (see `docs/DESIGN-prototype-d-rules.md`) chose the scoped
alternative: rules in their own localStorage key (`bts-rules-v1`) without the
rest of the SaveFile machinery.

This issue tracks what's still deferred.

## Out-of-scope items to build

### 1. `SaveFile` type and schema

Define the full structure in `v2/shared/types.ts`:

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
```

Add a JSON Schema at `v2/frontend/src/schemas/savefile.schema.json` used on
every load (from file or localStorage).

### 2. `ConfigContext`

New `v2/frontend/src/context/ConfigContext.tsx` provider wrapping `App`. Hook
`useConfig()` exposes `config`, mutators (`updateCategories`, `addRule`,
`removeRule`, `updateSettings`), `isDirty`, `saveToFile()`, `loadFromFile()`.

Migrating off App-level `useState` removes prop-drilling for settings and
rules; current consumers (DisplaySettings theme via its own localStorage key,
rules via App state) move into the context.

### 3. Persistence service

New `v2/frontend/src/services/persistence.ts`:

- Auto-save on every config change → localStorage key (single key holding the
  whole `SaveFile`).
- Save to file via `<a download>` with timestamped filename.
- Load from file via `<input type="file">`, validate against JSON Schema,
  replace in-memory config.
- Dirty tracking: "dirty" = in-memory config differs from the last file save.
- `beforeunload` listener fires when dirty.
- Visual indicator on the Save button.

### 4. Migration

New `v2/frontend/src/services/migration.ts`: one-time migration on first load
for users with existing `bts-rules-v1` localStorage. Wraps existing rules into
the new `SaveFile` structure; imports static `categories.json` into
`categories`.

### 5. Minimal UI

Save and Load buttons somewhere in the header or settings panel. Keep the
rules dropdown / dialog flow unchanged.

## Why this was deferred

Shipping prototype D's UX unblocked the main user-visible pain (no
categorization affordance for uncategorized transactions) and kept the initial
change reviewable. The SaveFile schema is a larger refactor that touches
state, persistence, and type definitions across the app; splitting it out
means either the features land separately with a clear migration path, or the
persistence work lands first without introducing partial UI.

## Acceptance checklist for this follow-up

- [ ] `SaveFile` type + JSON Schema in place; schema validated on load.
- [ ] `ConfigContext` wraps `App`; rules and settings read/write through it.
- [ ] One-time migration from `bts-rules-v1` (and the `theme` key) to
  `SaveFile` localStorage key.
- [ ] Save/Load file buttons in the UI.
- [ ] Dirty indicator and `beforeunload` prompt.
- [ ] Unit tests for schema validation and migration.
- [ ] E2E test for Save → edit → Load round-trip.

## References

- `docs/DESIGN-data-persistence.md` — original design of the SaveFile layer.
- `docs/DESIGN-prototype-d-rules.md` — what was shipped in this iteration.
- `docs/PLAN-category-editing.md` — historical plan stub that flagged the
  overlap question (now resolved).
