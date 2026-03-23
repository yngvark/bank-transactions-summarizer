# Design: Category Editing from the UI

## Problem

Categories are stored in a static JSON file (`v2/frontend/src/data/categories.json`) with 36 merchant-to-category mappings. There is no way to add or change mappings from the UI. Uncategorized transactions show "Ukjent kategori" as plain text with no affordance to fix it. Users must manually edit the JSON file.

## Current State

- **categories.json**: flat object mapping merchant category strings (from bank MCC codes) to `[primary, subcategory]` arrays
- **6 primary categories**: Mat og drikke, Reise, Personlig forbruk, Hus og innbo, Kontanter og pengeoverforing, Ovrig bruk
- **Category column in transactions table**: plain text, e.g. "Mat og drikke -> Dagligvarer"
- **Uncategorized**: shows "Ukjent kategori" with no visual distinction or call to action

## Prototypes

Three standalone HTML/CSS prototypes were built to explore different UX approaches. All use the app's existing design tokens and support light/dark mode.

### A: Inline Hierarchical Dropdown (`prototype-a-inline-dropdown.html`)

Category cells in the transaction table are directly clickable. Clicking opens a two-level dropdown: first pick a primary category, then a subcategory. Uncategorized cells are styled with an amber dashed border to draw attention. Assigning a category automatically applies to all transactions sharing that merchant category, with a confirmation bar.

**Strengths**: Lowest learning curve. No extra screen real estate. Direct manipulation -- see and fix in place.

**Weaknesses**: Must scroll through the table to find uncategorized rows. No overview of how many uncategorized merchants exist. Doesn't scale well if there are many uncategorized transactions spread across pages.

### B: Category Management Panel (`prototype-b-management-panel.html`)

A floating action button (bottom-right) shows a badge with the count of uncategorized merchants. Clicking opens a 420px slide-in panel from the right. The panel's top section lists all uncategorized merchant categories with dropdowns to assign them. The bottom section shows an accordion of all existing categories grouped by primary category. Hovering a merchant card in the panel highlights matching rows in the table.

**Strengths**: Best for bulk management. Surfaces all uncategorized merchants in one place regardless of where they appear in the table. Clear separation between "fix uncategorized" and "browse existing". The badge count gives immediate visibility into work remaining.

**Weaknesses**: Takes significant screen space. Higher learning curve -- the panel is a separate UI concept to discover. Less useful on mobile.

### C: Pill Tags with Searchable Combobox (`prototype-c-smart-suggestions.html`)

Categories are displayed as color-coded pill tags (green for food, blue for travel, purple for personal, red dashed for uncategorized). Each primary category gets a distinct color, making the column scannable at a glance. Clicking any pill opens a searchable combobox with categories grouped by primary. After selecting, a popover asks whether to update all transactions with that merchant category or just the current one. A toast notification confirms the action with an undo option. Includes a "+ Create new category" option.

**Strengths**: Most polished visual presentation. Color coding makes categories scannable without reading. Search is fast for power users. Batch-vs-single choice gives user control. Supports creating new categories. Toast with undo is forgiving.

**Weaknesses**: More visual complexity. The pills take slightly more space than plain text. The batch confirmation popover adds an extra step.

## Recommendation

**Prototype C** is the strongest overall choice for the following reasons:

1. **Visual scanning**: Color-coded pills make the category column immediately useful for spotting patterns, not just reading text. You can glance at the column and see "mostly green = food spending" without reading.

2. **Search**: The combobox with search is faster than navigating a two-level hierarchy (A) or scrolling a panel (B), especially as the number of categories grows.

3. **User control over batch updates**: Letting the user choose between "update all" and "just this one" is safer and more transparent than silently applying to all (A) or requiring a separate panel workflow (B).

4. **Extensibility**: The "+ Create new category" option means users aren't limited to predefined categories.

5. **Toast with undo**: Provides confidence to experiment without fear of breaking things.

However, elements from B could complement C: a small indicator showing "3 uncategorized merchants" somewhere in the UI (perhaps near the section header) would help users know there's work to do without needing to scroll through the table.

## Implementation Considerations

- Category mappings should be stored in `localStorage` so they persist across sessions without a backend
- The static `categories.json` should serve as the initial default, merged with any user-defined mappings
- When a user assigns a category, update the in-memory mapping and re-run `parseTransactions` + `calculateStatistics`
- Consider an export/import feature for the custom mappings so users can back them up or share them
