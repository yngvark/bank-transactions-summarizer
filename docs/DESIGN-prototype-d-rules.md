# Design: Rules-based Categorization (prototype D ported to production)

## Problem

Transactions are categorized via a static merchant-code lookup
(`v2/frontend/src/data/categories.json`, 36 entries). Any transaction whose
`Merchant Category` field isn't in that map falls through to `Ukjent kategori`
("unknown category"), shown as plain text with no affordance to fix. The
mapping is also inaccurate for merchants whose bank-provided code doesn't
reflect what they actually sell — e.g. online subscriptions billed through
generic payment processors land in unrelated buckets. There is no way to
correct this from the UI.

`prototypes/prototype-d-inline-sortable.html` demonstrated a solution: a
user-managed layer of *text-pattern rules* on top of the merchant-code lookup.
Click a category cell, pick a new category, confirm a matching pattern, and
every transaction whose `Text` matches the pattern adopts the new category.
The prototype persisted rules in `localStorage`, showed a live match preview
while editing, supported both substring and regex patterns, and left the
merchant-code lookup unchanged as the baseline.

## Decision

Port prototype D into the production React/TypeScript app as a second pass
after merchant-code categorization. Ship alongside a rule-reorder UI so that
**first-match-wins** (see "Overlap resolution" below) is controllable by the
user.

## Categorization pipeline

```
RawTransaction[] (filtered by search/date)
  → parseTransactions()         // merchant-code lookup → baseline Category
  → applyRules()                // user rules, first-match-wins → overrides
  → calculateStatistics()       // D3 rollup, heatmap, tree
```

`parseTransactions` is unchanged and stays pure — merchant-code only, returning
`Transaction[]` with a `Category` string. `applyRules` is a separate function
that, for each transaction, finds the first rule whose pattern matches
`tx.Text` and (if found) replaces `tx.Category` with the rule's
`[primary, sub].join(' ➡ ')`. If no rule matches, the merchant-code result is
preserved. Downstream code (`statistics.ts`, `categoryTree.ts`) sees the same
`Category` string format it always did.

Splitting the merchant-code pass from the rule pass keeps each concern
testable in isolation (`parser.test.ts`, `rules.test.ts`) and makes the rule
layer easy to turn off (empty rules array) or extend later without rewriting
the lookup.

## Data model

```typescript
// v2/shared/types.ts
export type RuleType = 'substring' | 'regex';

export interface TextPatternRule {
  id: string;              // crypto.randomUUID()
  type: RuleType;
  pattern: string;
  category: [string, string];  // [primary, sub] — both must exist in categories.json
}
```

Rules are stored as a JSON array in `localStorage` under `bts-rules-v1`. Array
**order is load-bearing** — it defines priority. Invalid JSON or missing key
returns `[]`.

## Overlap resolution: first-match-wins

An earlier open question in `docs/PLAN-category-editing.md` asked how to
resolve two rules that both match the same transaction. The decision is
**first-match-wins with a user-visible ordered list**:

- Rules are evaluated in array order; the first match is applied.
- Order is surfaced in the `RulesPanel` as an explicit `#1, #2, #3…` list.
- Per-row `↑` / `↓` buttons reorder rules (swapping adjacent positions),
  trivially persisted as the new localStorage array.

This mirrors how config-as-code tools (git attribute files, `.gitignore`,
webpack loaders) handle conflicting rules and avoids the surprises of
heuristic approaches like longest-pattern-wins. The rejected alternatives are
documented in `PLAN-category-editing.md`.

## UI components

| Component | Responsibility |
|-----------|----------------|
| `TransactionsTable` | Render category cell as a clickable button; style `Ukjent kategori` as a yellow `.cat-uncat` badge; sortable Category column header (asc → desc → none cycle). |
| `CategoryDropdown` | Two-level menu anchored below the clicked cell. Level 1: unique primaries derived from `CategoryMapping`. Level 2: subs for chosen primary. "Remove rule" top item when the clicked row already matches a rule. |
| `RuleDialog` | Modal with three modes — **create** (pattern pre-filled with `tx.Text`), **update** (pre-filled with existing rule), **delete** (minimal, preview-only). Substring/regex toggle, pattern input, live-match preview with highlight. Invalid regex sets an error state and disables the confirm button. |
| `RulesPanel` | Collapsible section that appears only when `rules.length > 0`. Lists rules in priority order with up/down reorder, Edit, Delete per row, and a "first match wins" hint. |
| `Toast` | Bottom-center transient notification for "Rule created/updated/deleted — N transactions …". Auto-dismisses after 3s. |

## State flow

All state lives in `App.tsx`; no context or external store:

- `rules: TextPatternRule[]` — loaded from localStorage on mount, persisted on
  every change via a `persistRules` helper (`setRules` + `saveRules`).
- `dropdown: { anchor: DOMRect; tx: Transaction } | null` — open dropdown.
- `dialog: { mode, category, initialPattern, initialType, ruleId? } | null` —
  open dialog.

Handlers:

- `handleCategoryClick(txIndex, anchor)` — open dropdown.
- `handleDropdownPick(primary, sub)` — if the clicked row already matches a
  rule, open dialog in **update** mode with the new category applied to the
  existing rule; otherwise **create** mode with the new category and
  transaction-text pattern.
- `handleDropdownRemove()` — open dialog in **delete** mode.
- `handleAddRule / handleUpdateRule / handleDeleteRule / handleReorderRule` —
  mutate the rules array, persist, show toast.

## Persistence scope (this iteration)

localStorage only. The broader `SaveFile` schema (categories + rules +
settings + JSON Schema validation + Save/Load file UI + dirty tracking) from
`docs/DESIGN-data-persistence.md` is deferred. See
`docs/ISSUE-savefile-infrastructure.md` for the follow-up scope.

## Out of scope

- **Adding or renaming categories.** Rules reference categories that must
  exist in `categories.json`.
- **Per-transaction overrides** (as in prototype C). If a user wants to
  override just one transaction, they use the exact transaction text as the
  pattern.
- **Rule templates / import-export.** Deferred to the SaveFile follow-up.
- **Mobile-specific dropdown.** The dropdown renders with a fixed-position
  anchor; on narrow viewports it may extend off-screen. Functional, but UX
  polish is deferred. The E2E tests for this feature skip Mobile Chrome for
  this reason; desktop behaviour is fully covered.

## Testing

- `v2/frontend/src/services/rules.test.ts` — unit tests for pattern matching,
  first-match-wins, localStorage round-trip, regex validation.
- `v2/e2e/category-rules.spec.ts` — end-to-end: create flow, persistence
  across reload, rules panel + delete, "Remove rule" dropdown option, sort
  cycle, invalid regex, yellow Ukjent kategori badge.

## Screenshots

See `screenshots/proto-d-*.png`:

- `proto-d-01-rules-collapsed.png` — rules panel collapsed (after creating one
  rule).
- `proto-d-02-rules-expanded.png` — panel expanded with reorder/edit/delete.
- `proto-d-03-dropdown.png` — category dropdown anchored to a clicked cell.
- `proto-d-04-dialog-create.png` — rule dialog with live preview and
  highlighted matches.
