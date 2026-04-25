# Design: Rule conflict chooser when categorizing a transaction

## Problem

The existing rules system (see `DESIGN-prototype-d-rules.md`) supports
overlapping patterns: rules are evaluated in array order with first-match-wins
semantics, so a specific rule placed above a broader one wins for the
transactions it matches. The rules engine, the rules panel reordering UI, and
`rules.test.ts:94-114` all assume this is how users will refine their
categorization over time.

The category-cell flow in `App.tsx` did not give users any way to *create*
that overlap. When the user clicked a transaction's category and picked a
target, `handleDropdownPick` called `findRuleForTransaction` and:

- if no existing rule matched → opened the rule dialog in `create` mode;
- if any rule matched → opened the same rule dialog in `update` mode for that
  matching rule, with no escape hatch.

Concrete user report:

1. Set "Vipps*something" → Pengeoverføring (pattern was generalized so it
   substring-matches other Vipps texts).
2. Clicked "Vipps*OUS" and picked "Restauranter og barer".
3. The dialog opened in update mode for the broad Vipps rule. There was no
   way to add a new, more specific rule — only to overwrite the existing one.

The mismatch: the engine supports overlap, the UI didn't let users express
overlap from the most natural entry point (clicking a transaction).

## Decision

Insert a small **rule conflict chooser** between the category dropdown and
the rule dialog. When the user picks a category for a transaction whose text
already matches an existing rule, ask explicitly:

- **Update existing rule's category** — current behavior; routes to the rule
  dialog in `update` mode.
- **Create new specific rule (above existing)** — routes to the rule dialog
  in `create` mode, prefilled with the full transaction text as the pattern;
  on save, the new rule is inserted at the matching rule's index so
  first-match-wins gives the new rule priority.
- **Cancel** — close, no change.

Rejected alternatives:

- *Auto-decide: same picked category → update, different → create.* Saves a
  click but assumes intent. The user might want to refine the broad rule's
  pattern or category; treating "different category" as "always create new"
  silently changes long-standing UX in a way that's hard to discover.
- *Always create a new rule from this path.* Simplest code but breaks the
  existing flow where users click a previously-rule-categorized transaction
  to fix the rule. That flow is documented behavior in the existing E2E test
  at `category-rules.spec.ts:116-131` ("clicking a rule-matched row shows
  Remove rule option").

The explicit chooser keeps both flows discoverable and matches the
"first-match-wins" mental model already surfaced in the rules panel hint.

## Implementation

### State

`App.tsx` gains a `ConflictState` between `DropdownState` and `DialogState`:

```ts
type ConflictState = {
  tx: Transaction;
  pickedCategory: [string, string];
  existing: TextPatternRule;
} | null;
```

`DialogState` gains an optional `insertAboveRuleId?: string` for the new
"create above existing" path.

### Routing

`handleDropdownPick` no longer branches into `dialog: 'update'` directly
when an existing rule matches. Instead it sets `conflict` state. Two new
handlers route the user's choice:

- `handleConflictUpdateExisting` → opens the rule dialog in `update` mode,
  with the newly picked category but the existing rule's pattern/type/id
  (so saving updates that rule's category).
- `handleConflictCreateSpecific` → opens the rule dialog in `create` mode,
  prefilled with `tx.Text` as pattern, and carries `insertAboveRuleId` so
  `handleAddRule` inserts at the right index.

### Insertion

`handleAddRule(rule, insertAboveRuleId?)` splices the new rule at the index
of the matching rule when `insertAboveRuleId` is provided, otherwise appends
to the end (existing behavior). Splicing rather than always-prepending keeps
unrelated rule ordering stable when the user has already curated a long list.

### UI

`components/RuleConflictChooser.tsx` is a new modal that mirrors the
`rule-dialog`/`rd-*` style classes for visual consistency. It shows:

- the transaction text in a monospace box;
- the existing rule's category badge and its `(type): pattern`;
- the newly picked category badge;
- three stacked footer buttons: primary "Create new specific rule (above
  existing)", ghost "Update existing rule's category", ghost "Cancel".

Stacked footer (`.rd-footer-stack`) is used because the primary action
label is long enough that it doesn't read well in the inline footer layout
the existing rule dialog uses.

`handleDropdownRemove` (the "remove rule" path) is intentionally unchanged —
removing a category should still affect whatever rule currently applies it.

## Verification

- Unit tests in `rules.test.ts` pass unchanged — the engine semantics are
  unchanged; only the UI funnel is new.
- Two new E2E tests in `e2e/category-rules.spec.ts`:
  - **Create new specific rule above existing** — sets up a broad rule
    (pattern `at`, matches "Purchase at KOMPLETT.NO - Online" and "Pending
    at ZARA"), clicks the second matching transaction, picks a different
    category, exercises the "Create new specific rule" path. Asserts that
    the new specific rule sits above the broad rule, that the targeted
    transaction shows the new category, and that the other matching
    transaction still shows the broad rule's category.
  - **Update existing rule when chosen** — same setup, exercises the
    "Update existing rule's category" path. Asserts that both matching
    transactions reflect the new category (broad rule's category was
    rewritten) and that there is still only one rule.
- Manual verification with Playwright against the dev server confirmed the
  chooser renders correctly, both paths work, and the rules panel shows the
  expected ordering. Screenshots: `screenshots/rule-conflict-chooser.png`,
  `screenshots/rule-conflict-rules-panel.png`.
