# Plan: Hierarchical Categories with Expand/Collapse (Issue #22)

## Context
The statistics table currently shows categories as flat rows (`"Reise ➡ Flyselskap"`). Issue 22 requests hierarchical categories with expand/collapse, parent sum aggregation, and support for N levels of nesting. `prototype4-combined.html` demonstrates the target UX: depth-based row shading, chevron indicators, per-node expand/collapse, and global Expand/Collapse/Heatmap controls.

## Approach
Build a category tree from the existing d3 rollup results (flat strings split on `" ➡ "`). This requires zero changes to `parser.ts`, `randomize.ts`, or the d3 rollup logic — we only restructure the output and rewrite the table rendering.

## Steps

### 1. Add types — `v2/shared/types.ts`
- Add `CategoryTreeNode` interface: `{ name, path, depth, periodTotals[], average, sum, children[] }`
- Add `categoryTree: CategoryTreeNode[]` field to `GroupedStatistics`

### 2. New file — `v2/frontend/src/services/categoryTree.ts`
- Export `buildCategoryTree(rawTableData: RawRowData[], yearMonths: string[]): CategoryTreeNode[]`
- Split each `rawTableData[].category` on `" ➡ "` to get path segments
- Insert into tree structure; leaf nodes get data from rawTableData
- Walk bottom-up: parent `periodTotals[i]` = sum of children's `periodTotals[i]`, compute parent sum/avg
- Sort children alphabetically
- Handles `"Ukjent kategori"` (no arrow) as a depth-0 leaf node

### 3. Wire up — `v2/frontend/src/services/statistics.ts`
- Import `buildCategoryTree`, call after computing `rawTableData`
- Add `categoryTree` to return object

### 4. Rewrite — `v2/frontend/src/components/StatisticsTable.tsx`
This is the main change. New features:

**State:**
- `expandState: Record<string, boolean>` — keyed by node path (e.g. `"Reise"`, `"Reise/Flyselskap"`)
- `heatmapEnabled: boolean` — defaults to `true` (preserves current always-on behavior)

**Tree flattening for render:**
- `collectVisibleRows()` — walk tree, emit rows, recurse into expanded nodes only

**Controls bar** (above the table, inside component):
- Collapse / Expand one level buttons
- Collapse All / Expand All buttons
- Heatmap toggle button
- Logic mirrors prototype4-combined.html exactly

**Row rendering:**
- `<tr className="depth-{N}">` with depth-based visual styling
- First `<td>`: indent spacer (`depth * 16px`) + chevron (▶, rotated when open) + name
- Parent rows are clickable to toggle expand/collapse
- Number cells: formatted values with conditional heatmap coloring
- Footer: grand total row (same as current)

**Keep existing:** `calculateCellColor`, `interpolateColor`, `COLOR_CONFIG` unchanged

**Default state:** All depth-0 nodes start collapsed (clean overview), user expands to drill in

### 5. CSS additions — `v2/frontend/src/styles/index.css`
- Depth-based row styles (`.statistics-section tr.depth-0` through `.depth-3`) — background, font-weight, font-size
- **Critical:** `td:first-child` background per depth must match row background for sticky column
- Chevron/indent styles: `.cat-content`, `.chevron`, `.chevron.open`, `.no-chevron`, `.cat-cell-parent`
- Controls bar styles: `.statistics-controls-bar`, button states
- Scope existing even/odd striping to `.transactions-section` only (conflicts with depth styling)
- Monospace font for number cells in statistics table (matching prototype)

### 6. Update E2E tests — `v2/e2e/mobile-responsive.spec.ts`
- Update selectors for new table structure (depth classes, controls bar)
- Verify mobile still hides month columns correctly

## Files Changed
| File | Change |
|------|--------|
| `v2/shared/types.ts` | Add `CategoryTreeNode`, extend `GroupedStatistics` |
| `v2/frontend/src/services/categoryTree.ts` | **NEW** — tree building from flat rollup data |
| `v2/frontend/src/services/statistics.ts` | Call `buildCategoryTree`, add to return |
| `v2/frontend/src/components/StatisticsTable.tsx` | Rewrite for tree rendering + controls |
| `v2/frontend/src/styles/index.css` | Depth styles, chevron CSS, controls bar, scope striping |
| `v2/e2e/mobile-responsive.spec.ts` | Update selectors |

## Reference
- `prototype4-combined.html` — the target behavior and visual design to match

## Verification
1. Run `npm run dev` in `v2/frontend/`, load sample data, verify:
   - Top-level categories shown collapsed with sums
   - Clicking chevron/row expands children
   - Expand/Collapse one-level and all buttons work
   - Heatmap toggle works
   - Numbers match (parent = sum of children)
2. Use Playwright to verify visually on desktop and mobile
3. Run existing E2E tests: `npx playwright test` in `v2/e2e/`
