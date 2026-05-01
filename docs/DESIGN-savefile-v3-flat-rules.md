# Design: SaveFile v3 — Flat `rules: Rule[]`

## Context

SaveFile v2 stored categorization data in two separate structures inside `rules`:

```json
{
  "version": 2,
  "rules": {
    "merchantCodeMappings": { "Electronic Sales": ["Personlig forbruk", "PC og elektroutstyr"] },
    "textPatternRules": [{ "id": "...", "type": "substring", "pattern": "..." }]
  }
}
```

This split reflected the historical implementation: merchant-code lookup happened in the parser (`parseTransactions`) before text-pattern rules were applied. The two structures served different pipeline stages and had to be kept in sync separately (category renames had to propagate to both).

## What Changed (v3)

SaveFile v3 unifies both into a single flat array:

```json
{
  "version": 3,
  "rules": [
    { "id": "seed-Electronic Sales", "field": "merchantCategory", "match": "exact", "pattern": "Electronic Sales", "category": ["Personlig forbruk", "PC og elektroutstyr"] },
    { "id": "user-rule-1", "field": "text", "match": "substring", "pattern": "SPOTIFY", "category": ["Personlig forbruk", "Digitale tjenester"] }
  ]
}
```

The `Rule` type was already added in an earlier task:

```ts
interface Rule {
  id: string;
  field: 'text' | 'merchantCategory';
  match: 'substring' | 'regex' | 'exact';
  pattern: string;
  category: [string, string];
}
```

### Seeded rules

On first boot (or when the stored SaveFile fails validation), `boot.ts` generates 36 seed rules from `categories.json` using `field: 'merchantCategory'` and `match: 'exact'`. These replace the old `merchantCodeMappings` object.

### Pipeline change

`parseTransactions` no longer resolves categories. It sets `Category: 'Ukjent kategori'` for every transaction. Categorization is done entirely in `applyRules` which iterates the flat `Rule[]` in order (first match wins).

### Priority model

Seeded rules are stored at the end of the array. When a user creates a rule via the UI, it is prepended — this ensures user intent takes priority over the automatic merchant-code categorization, preserving the semantics of the v2 system.

### UI: RulesPanel and dialog flow

The `RulesPanel` shows only **non-seeded** rules (`!id.startsWith('seed-')`). The 36 seeded merchant-category rules are automatic and would flood the list. User-created rules — whether `text` or `merchantCategory` — appear in the panel with a field badge ("Text" / "Merch.") next to the existing match-kind badge.

The `CategoryDropdown` → `RuleDialog` flow also looks up "existing rule" against the non-seeded subset. Clicking a transaction whose category was set by a seeded rule opens the dialog in **create** mode (not update). The dialog defaults are picked smartly: if the transaction has a non-empty `Merchant Category` column, the dialog opens with `field='merchantCategory'`, `match='exact'`, `pattern=<the merchant-category string>`. Otherwise it falls back to `field='text'`, `match='substring'`, `pattern=<transaction text>`. The user can switch field or match before saving.

The `RuleDialog` exposes both axes:
- A "Match field" toggle (Text / Merchant Category)
- A "Match type" toggle (Substring / Regex / Exact)

For `field='merchantCategory'` rules, the live preview lists matching transactions but does not highlight within the row text (the matched value lives in the Merchant Category column, not the displayed Text).

## Migration

Old v2 payloads in localStorage are **rejected** (not migrated). The schema version changed from `2` to `3`; the Zod validator rejects any payload with `version: 2`. On rejection, the old payload is backed up to `bts-savefile-v1.bak` and a fresh v3 save file is built from defaults. Users with real v2 data would lose their text-pattern rules, but no real data existed at migration time.

## Files Changed

- `v2/shared/types.ts` — `SaveFile.rules` changed from nested object to `Rule[]`; version bumped to `3`; legacy `RuleType`/`TextPatternRule`/`CategoryMapping` removed.
- `v2/frontend/src/schemas/savefile.ts` — Zod schema for v3.
- `v2/frontend/src/services/boot.ts` — `importSeededRules`, `deriveCategoryTree(Rule[])`, `reconcileCategoriesWithRules`, `buildFreshSaveFile`.
- `v2/frontend/src/services/parser.ts` — `categoryMapping` parameter removed; default category is `'Ukjent kategori'`.
- `v2/frontend/src/services/rules.ts` — `matchesRule(tx, rule)` dispatches on `field` + `match`. `applyRules`, `findRuleForTransaction`, `getMatchingTransactions` operate on `Rule[]`. Legacy `matchesPattern` removed.
- `v2/frontend/src/services/categoryEdit.ts` — `rewriteRulesForRename`, `collectAffectedRules`, `renameCategoryCascade` operate on `Rule[]`; mapping helpers removed.
- `v2/frontend/src/context/ConfigContext.tsx` + `useConfig.ts` — single `updateRules(Rule[])`; `updateMerchantMappings` removed.
- `v2/frontend/src/components/StatisticsTable.tsx` — single-cleanup branch on category delete.
- `v2/frontend/src/components/RulesPanel.tsx` — `Rule[]` props; field badge per row.
- `v2/frontend/src/components/CategoryDropdown.tsx` — `existingRule?: Rule`.
- `v2/frontend/src/components/RuleDialog.tsx` — match-field toggle, match-kind toggle expanded with Exact, native `Rule` shape on save.
- `v2/frontend/src/App.tsx` — `userRules` filter (non-seeded), smart default for new rules, dialog state carries `initialField`/`initialMatch`.
- `v2/e2e/category-rules.spec.ts` + `v2/e2e/user-stories.spec.ts` — coverage for creating a merchant-category rule from an unmapped transaction.
- `v2/e2e/savefile-roundtrip.spec.ts` — fixture expectations updated to v3 shape.
