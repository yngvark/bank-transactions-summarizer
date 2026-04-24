# Plan: Category Editing from the UI

**Status:** Stub. Only known-issue notes captured so far; full plan not yet written.

## Related docs
- `DESIGN-category-editing.md` &mdash; design exploration and prototype comparison
- `../prototypes/prototype-a-inline-dropdown.html`, `../prototypes/prototype-b-management-panel.html`, `../prototypes/prototype-c-smart-suggestions.html`, `../prototypes/prototype-d-inline-sortable.html`

## Open design questions

### Pattern conflict resolution when the user writes overlapping patterns

**Context.** The real app categorizes transactions via a static merchant-code lookup (`categories.json`). When we add user-editable patterns on top, two patterns that the user has written may both match the same transaction &mdash; e.g. a narrow pattern `MENY STORO` &rarr; `Mat og drikke > Dagligvarer` and a later, broader regex `kiwi|meny` &rarr; `Kontanter > Kontantuttak`.

**What needs to be decided before implementation:**

1. **Resolution rule.** When two user patterns match the same transaction, which one wins? Options:
   - First-match-wins against an explicit, user-visible ordered list (user can reorder).
   - Longest-pattern-wins (heuristic; no ordering UI needed but can surprise users).
   - Disallow overlap &mdash; force the user to resolve when creating/editing a pattern that would overlap an existing one.

2. **Preview must reflect the effective result.** The prototype D preview shows pattern matches, not final categorization. Any implementation must show per-row status: *will update* vs *blocked by pattern X*. A misleading preview is worse than no preview.

3. **In-dialog resolution.** If the preview surfaces a conflict, the same dialog should offer a one-click fix (&ldquo;Delete the blocking pattern&rdquo;, or &ldquo;Move this pattern above it&rdquo;). Notification without a fix path is a dead end.

**Note on prototype D.** An earlier version of prototype D auto-created one pattern per unique merchant on first load, which produced a bug where broadening a pattern only updated some of the matched transactions. The prototype has been corrected to match the intended model: transactions start with the merchant-code default (from `categories.json`, represented as `defCat` in the prototype demo data), and user-created patterns are applied on top. See the &ldquo;Design notes&rdquo; section at the bottom of `../prototypes/prototype-d-inline-sortable.html`.

The open design question captured here (what to do when the user writes two of their own overlapping patterns) is not yet demonstrated in any prototype &mdash; the current prototype uses last-created-wins by implicit array order, which is not a commitment for the real app.
