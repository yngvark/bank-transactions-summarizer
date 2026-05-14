# Editable target category in the rule edit dialog

## Problem

When opening an existing rule via the rules-panel "Edit" button, the rule's
target category was rendered as a static badge — a `[primary, sub]` pair the
user could not change. The only way to "move" a rule to a different category
was to delete it and create a new one from a transaction row that belonged to
the desired category. That is awkward when the user changes their mind about
where a pattern should land, or when reorganising categories.

## Decision

Allow the target category to be changed in-place from the rule dialog. The
category badge becomes a button; clicking it opens the existing
`CategoryDropdown` popover (the same two-step picker used elsewhere in the
app), anchored to the badge. Picking a `(primary, sub)` updates the dialog's
working state, and `Update rule` writes the new category into the rule.

## Why reuse `CategoryDropdown` instead of native selects

- Visual consistency with the rest of the app — users already recognise the
  two-step picker.
- Avoids duplicating the primary→sub drill-down logic.
- The dropdown reads its options from the SaveFile's `categories` tree, which
  is the source of truth for available categories (it may include categories
  the user added that have no rule yet — those become valid targets too).

## Z-index inside the modal

`.rule-dialog` has `z-index: 1101` and creates its own stacking context.
Rendering the `CategoryDropdown` (which uses `position: fixed`) inside the
dialog keeps it stacked above the modal content. The `.rd-category-picker`
wrapper bumps the dropdown and its backdrop into a high band (1102/1103) so
ordering is unambiguous inside the modal's stacking context.

## Out of scope

Adding a brand-new category from within the rule dialog is intentionally not
supported here. Category-tree editing already has a dedicated UI (the
statistics-table edit mode); this dialog stays focused on rule editing.
