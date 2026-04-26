# Prototype G Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port prototype G (inline edit-mode in the statistics table) into the production app: an "Edit categories" toggle that turns the statistics table into an inline editor for an arbitrary-depth, user-editable category tree, persisted via SaveFile.

**Architecture:** Replace the current 2-level `CategoryTree` shape (`Record<primary, { emoji?, subcategories[] }>`) with a recursive `CategoryNode[]` (`{ name, emoji?, children: CategoryNode[] }`). Bump `SaveFile.version` 1→2 and write a v1→v2 migration. Add a pure `categoryEdit` service for tree mutations (rename / addChild / deleteSubtree / reorder / setEmoji) keyed by index-path arrays. `StatisticsTable` gets an edit-mode toggle: in edit mode it merges `config.categories` (full tree) with `statistics.categoryTree` (transaction-derived amounts) and renders editable rows. Renames cascade-rewrite `merchantCodeMappings` and `textPatternRules`; deletes cascade-rewrite both. `CategoryDropdown` re-sources its primaries/subs from `config.categories` so the picker stays in sync.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Playwright, Zod, plain CSS, vanilla mouse-driven drag-drop (no libraries).

---

## File Structure

**Created**

- `v2/frontend/src/services/categoryEdit.ts` — pure tree manipulation (rename, addChild, deleteSubtree, reorder, setEmoji, path utilities, rule/mapping rewriters)
- `v2/frontend/src/services/categoryEdit.test.ts` — unit tests for the above
- `v2/e2e/category-tree-edit.spec.ts` — E2E coverage for the edit toggle, rename, add, delete

**Modified**

- `v2/shared/types.ts` — `CategoryTree` becomes recursive `CategoryNode[]`; `SaveFile.version: 2`
- `v2/frontend/src/schemas/savefile.ts` — recursive zod schema; `version: z.literal(2)`
- `v2/frontend/src/services/migration.ts` — v1→v2 conversion; `buildFreshSaveFile` produces v2 shape; `deriveCategoryTree` returns `CategoryNode[]`
- `v2/frontend/src/services/migration.test.ts` — update fixtures and assertions to v2 shape; add v1→v2 migration test
- `v2/frontend/src/components/StatisticsTable.tsx` — edit toggle; full-tree merge; inline editing chrome
- `v2/frontend/src/components/CategoryDropdown.tsx` — read primaries/subs from `config.categories` instead of `merchantCodeMappings`
- `v2/frontend/src/styles/index.css` — edit-mode styles (toggle pill, hint banner, drag handle, row actions, name input, tree rail, emoji picker)
- `v2/frontend/src/App.tsx` — pass `categoryTree` (from `config.categories`) to `CategoryDropdown` instead of `categoryMapping`
- `v2/frontend/src/services/persistence.test.ts` — fixtures bumped to v2
- `docs/DESIGN-category-editing.md` — append a "Status — implementation" section at the bottom

---

## Task 1: Recursive `CategoryTree` data model + v1→v2 migration

**Files:**
- Modify: `v2/shared/types.ts`
- Modify: `v2/frontend/src/schemas/savefile.ts`
- Modify: `v2/frontend/src/services/migration.ts`
- Modify: `v2/frontend/src/services/migration.test.ts`
- Modify: `v2/frontend/src/services/persistence.test.ts`

- [ ] **Step 1: Update `shared/types.ts` with recursive node + bumped version**

Replace the current `CategoryTree` block in `v2/shared/types.ts` with:

```ts
// Recursive category node. Top-level nodes typically carry an emoji;
// deeper nodes do not. Children are ordered (rendering and persistence
// preserve sibling order).
export interface CategoryNode {
  name: string;
  emoji?: string;
  children: CategoryNode[];
}

// Ordered list of root-level category nodes.
export type CategoryTree = CategoryNode[];
```

And in `SaveFile`:

```ts
export interface SaveFile {
  version: 2;
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
```

- [ ] **Step 2: Update zod schema in `v2/frontend/src/schemas/savefile.ts`**

Replace the `CategoryTreeNodeSchema` / `CategoryTreeSchema` block with a recursive zod schema and bump `version`:

```ts
const CategoryNodeSchema: z.ZodType<{
  name: string;
  emoji?: string;
  children: CategoryNode[];
}> = z.lazy(() =>
  z.strictObject({
    name: z.string(),
    emoji: z.string().optional(),
    children: z.array(CategoryNodeSchema),
  })
);

const CategoryTreeSchema = z.array(CategoryNodeSchema);

export const SaveFileSchema = z.strictObject({
  version: z.literal(2),
  categories: CategoryTreeSchema,
  rules: z.strictObject({
    merchantCodeMappings: z.record(z.string(), z.tuple([z.string(), z.string()])),
    textPatternRules: z.array(TextPatternRuleSchema),
  }),
  settings: z.strictObject({
    theme: z.enum(['light', 'dark']),
    density: z.string(),
  }),
});
```

Import `CategoryNode` at top: `import type { SaveFile, CategoryNode } from '../../../shared/types';`

- [ ] **Step 3: Update migration to produce + accept v2 shape**

In `v2/frontend/src/services/migration.ts`:

1. `deriveCategoryTree` now returns `CategoryNode[]` instead of the old shape:

```ts
export function deriveCategoryTree(mappings: CategoryMapping): CategoryTree {
  // Group sub-names per primary, preserving insertion order
  const byPrimary = new Map<string, Set<string>>();
  for (const [primary, sub] of Object.values(mappings)) {
    if (!byPrimary.has(primary)) byPrimary.set(primary, new Set());
    byPrimary.get(primary)!.add(sub);
  }
  const primaries = Array.from(byPrimary.keys()).sort((a, b) => a.localeCompare(b, 'nb'));
  return primaries.map((name) => ({
    name,
    children: Array.from(byPrimary.get(name)!).sort((a, b) => a.localeCompare(b, 'nb')).map((sub) => ({
      name: sub,
      children: [],
    })),
  }));
}
```

2. Add a `migrateV1ToV2` helper that converts the legacy `Record<string, { emoji?, subcategories[] }>` shape to the new recursive shape:

```ts
type V1CategoryTree = Record<string, { emoji?: string; subcategories: string[] }>;

function migrateV1Categories(v1: V1CategoryTree): CategoryTree {
  const primaries = Object.keys(v1).sort((a, b) => a.localeCompare(b, 'nb'));
  return primaries.map((name) => {
    const node = v1[name];
    const out: CategoryNode = {
      name,
      children: node.subcategories.map((sub) => ({ name: sub, children: [] })),
    };
    if (node.emoji) out.emoji = node.emoji;
    return out;
  });
}
```

3. In `runMigration`, after reading the raw blob:
   - Try schema validation first (handles v2)
   - If it fails AND parsed JSON has `version === 1` with the legacy `categories` shape, run `migrateV1Categories`, bump version to 2, persist, and return
   - Otherwise fall through to the existing backup+rebuild path

```ts
export function runMigration(): SaveFile {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw != null) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
      console.warn(
        `[bts] Stored SaveFile is not valid JSON. Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
      );
      const fresh = buildFreshSaveFile();
      localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
      localStorage.removeItem(LEGACY_RULES_KEY);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return fresh;
    }

    // v2 path
    const result = validateSaveFile(parsed);
    if (result.ok) return result.data;

    // v1 → v2 path
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      (parsed as { version?: unknown }).version === 1 &&
      (parsed as { categories?: unknown }).categories &&
      typeof (parsed as { categories: unknown }).categories === 'object' &&
      !Array.isArray((parsed as { categories: unknown }).categories)
    ) {
      try {
        const p = parsed as {
          version: 1;
          categories: V1CategoryTree;
          rules: SaveFile['rules'];
          settings: SaveFile['settings'];
        };
        const upgraded: SaveFile = {
          version: 2,
          categories: migrateV1Categories(p.categories),
          rules: p.rules,
          settings: p.settings,
        };
        const ok = validateSaveFile(upgraded);
        if (ok.ok) {
          localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(ok.data));
          return ok.data;
        }
      } catch {
        // fall through to rebuild below
      }
    }

    // Fallback: backup + rebuild
    localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
    console.warn(
      `[bts] Stored SaveFile failed validation (${result.error}). ` +
        `Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
    );
  }

  const fresh = buildFreshSaveFile();
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
  localStorage.removeItem(LEGACY_RULES_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  return fresh;
}
```

4. `buildFreshSaveFile` keeps its current logic — but since `deriveCategoryTree` now returns the new shape, and `version` is `2`, it produces a valid v2 SaveFile.

```ts
function buildFreshSaveFile(): SaveFile {
  const merchantCodeMappings = importMerchantMappings();
  return {
    version: 2,
    categories: deriveCategoryTree(merchantCodeMappings),
    rules: {
      merchantCodeMappings,
      textPatternRules: readLegacyRules(),
    },
    settings: {
      theme: readLegacyTheme(),
      density: 'normal',
    },
  };
}
```

- [ ] **Step 4: Update migration tests**

In `v2/frontend/src/services/migration.test.ts`:

1. Replace `deriveCategoryTree` tests with the new shape:

```ts
describe('deriveCategoryTree', () => {
  it('groups sub-nodes under primary nodes (recursive)', () => {
    const tree = deriveCategoryTree({
      A: ['Food', 'Groceries'],
      B: ['Food', 'Restaurants'],
      C: ['Travel', 'Flights'],
    });
    const food = tree.find((n) => n.name === 'Food');
    const travel = tree.find((n) => n.name === 'Travel');
    expect(food?.children.map((c) => c.name)).toEqual(['Groceries', 'Restaurants']);
    expect(travel?.children.map((c) => c.name)).toEqual(['Flights']);
    expect(food?.children.every((c) => c.children.length === 0)).toBe(true);
  });

  it('deduplicates sub-nodes', () => {
    const tree = deriveCategoryTree({
      A: ['Food', 'Groceries'],
      B: ['Food', 'Groceries'],
    });
    const food = tree.find((n) => n.name === 'Food')!;
    expect(food.children.map((c) => c.name)).toEqual(['Groceries']);
  });

  it('returns empty array for empty mappings', () => {
    expect(deriveCategoryTree({})).toEqual([]);
  });
});
```

2. Update existing assertions on `sf.categories` to use the array shape (e.g. `Object.keys(sf.categories).length` becomes `sf.categories.length`).

3. Add a new test: `runMigration upgrades a v1 SaveFile to v2`:

```ts
it('upgrades a v1 SaveFile to v2 in place', () => {
  const v1 = {
    version: 1,
    categories: {
      'Mat og drikke': { emoji: '🍔', subcategories: ['Dagligvarer', 'Restauranter'] },
      Reise: { emoji: '✈️', subcategories: ['Tog'] },
    },
    rules: {
      merchantCodeMappings: { '5411': ['Mat og drikke', 'Dagligvarer'] },
      textPatternRules: [],
    },
    settings: { theme: 'light', density: 'normal' },
  };
  store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(v1));
  const sf = runMigration();
  expect(sf.version).toBe(2);
  expect(Array.isArray(sf.categories)).toBe(true);
  const mat = sf.categories.find((n) => n.name === 'Mat og drikke');
  expect(mat?.emoji).toBe('🍔');
  expect(mat?.children.map((c) => c.name)).toEqual(['Dagligvarer', 'Restauranter']);
  // Persisted back to localStorage with v2 shape
  expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!).version).toBe(2);
});
```

- [ ] **Step 5: Update persistence test fixtures to v2**

In `v2/frontend/src/services/persistence.test.ts`, any inline `SaveFile` literal must use `version: 2` and `categories` as an array. Spot-check after editing.

- [ ] **Step 6: Run unit tests**

Run: `cd /workspace/v2/frontend && pnpm test`
Expected: all green. If any test still uses the old shape, fix it inline.

- [ ] **Step 7: Run typecheck and lint**

Run: `cd /workspace/v2/frontend && pnpm run build`
Expected: build passes (TypeScript happy).

Run: `cd /workspace/v2/frontend && pnpm run lint`
Expected: no warnings/errors.

- [ ] **Step 8: Commit**

```bash
git add v2/shared/types.ts v2/frontend/src/schemas/savefile.ts v2/frontend/src/services/migration.ts v2/frontend/src/services/migration.test.ts v2/frontend/src/services/persistence.test.ts
git commit -m "$(cat <<'EOF'
feat: recursive CategoryTree (SaveFile v1→v2)

Replace 2-level CategoryTree with recursive CategoryNode[]; bump
SaveFile.version to 2; migrate stored v1 blobs in place.
EOF
)"
```

---

## Task 2: `categoryEdit` pure-function service

**Files:**
- Create: `v2/frontend/src/services/categoryEdit.ts`
- Create: `v2/frontend/src/services/categoryEdit.test.ts`

The service operates on immutable `CategoryTree` instances using path arrays of sibling indices (matching the prototype's `pathStr`/`getNode` helpers).

- [ ] **Step 1: Write the failing tests**

Create `v2/frontend/src/services/categoryEdit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getNodeAt,
  countDescendants,
  renameAt,
  addChildAt,
  deleteAt,
  reorderSiblings,
  setEmojiAt,
  pathOfPrimaryByName,
  collectAffectedRules,
  rewriteRulesForRename,
  rewriteMappingsForRename,
} from './categoryEdit';
import type { CategoryTree, TextPatternRule } from '../../../shared/types';

const baseTree = (): CategoryTree => [
  { name: 'Mat og drikke', emoji: '🍔', children: [
    { name: 'Dagligvarer', children: [{ name: 'Rema 1000', children: [] }] },
    { name: 'Restaurant', children: [] },
  ]},
  { name: 'Reise', emoji: '✈️', children: [
    { name: 'Tog', children: [] },
  ]},
];

describe('getNodeAt', () => {
  it('returns the root at path [i]', () => {
    expect(getNodeAt(baseTree(), [0]).name).toBe('Mat og drikke');
  });
  it('returns a deep node at path [i,j,k]', () => {
    expect(getNodeAt(baseTree(), [0, 0, 0]).name).toBe('Rema 1000');
  });
  it('throws on invalid path', () => {
    expect(() => getNodeAt(baseTree(), [99])).toThrow();
  });
});

describe('countDescendants', () => {
  it('returns 0 for a leaf', () => {
    expect(countDescendants({ name: 'X', children: [] })).toBe(0);
  });
  it('counts subtree size', () => {
    expect(countDescendants(baseTree()[0])).toBe(3); // Dagligvarer + Rema + Restaurant
  });
});

describe('renameAt', () => {
  it('renames the node and returns a new tree', () => {
    const t = baseTree();
    const next = renameAt(t, [0, 0], 'Mat — daglig');
    expect(next[0].children[0].name).toBe('Mat — daglig');
    expect(t[0].children[0].name).toBe('Dagligvarer'); // original unchanged
  });
  it('throws on duplicate sibling name', () => {
    const t = baseTree();
    expect(() => renameAt(t, [0, 0], 'Restaurant')).toThrow(/sibling/i);
  });
  it('allows same-name (no-op)', () => {
    const t = baseTree();
    const next = renameAt(t, [0, 0], 'Dagligvarer');
    expect(next).toEqual(t);
  });
});

describe('addChildAt', () => {
  it('appends a child under the targeted node', () => {
    const t = baseTree();
    const next = addChildAt(t, [1], 'Hotell');
    expect(next[1].children.map((c) => c.name)).toEqual(['Tog', 'Hotell']);
  });
  it('throws on duplicate name within the same parent', () => {
    const t = baseTree();
    expect(() => addChildAt(t, [1], 'Tog')).toThrow(/exists/i);
  });
  it('returns the path of the new child', () => {
    const t = baseTree();
    const { tree, path } = addChildAt(t, [1], 'Hotell', { withPath: true });
    expect(path).toEqual([1, 1]);
    expect(tree[1].children[1].name).toBe('Hotell');
  });
});

describe('deleteAt', () => {
  it('removes the targeted subtree', () => {
    const t = baseTree();
    const next = deleteAt(t, [0, 0]);
    expect(next[0].children.map((c) => c.name)).toEqual(['Restaurant']);
  });
  it('removes a root', () => {
    const next = deleteAt(baseTree(), [1]);
    expect(next.map((n) => n.name)).toEqual(['Mat og drikke']);
  });
});

describe('reorderSiblings', () => {
  it('moves a node within its sibling group', () => {
    const t = baseTree();
    const next = reorderSiblings(t, [0, 0], 1);
    expect(next[0].children.map((c) => c.name)).toEqual(['Restaurant', 'Dagligvarer']);
  });
  it('clamps target index into bounds', () => {
    const t = baseTree();
    const next = reorderSiblings(t, [0, 0], 99);
    expect(next[0].children.map((c) => c.name)).toEqual(['Restaurant', 'Dagligvarer']);
  });
});

describe('setEmojiAt', () => {
  it('sets the emoji on a top-level node', () => {
    const t = baseTree();
    const next = setEmojiAt(t, [0], '🥘');
    expect(next[0].emoji).toBe('🥘');
  });
});

describe('pathOfPrimaryByName', () => {
  it('finds a top-level node by name', () => {
    expect(pathOfPrimaryByName(baseTree(), 'Reise')).toEqual([1]);
  });
  it('returns null when not found', () => {
    expect(pathOfPrimaryByName(baseTree(), 'Nope')).toBeNull();
  });
});

describe('rewriteRulesForRename', () => {
  const rules: TextPatternRule[] = [
    { id: '1', type: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
    { id: '2', type: 'substring', pattern: 'B', category: ['Reise', 'Tog'] },
    { id: '3', type: 'substring', pattern: 'C', category: ['Mat og drikke', 'Restaurant'] },
  ];

  it('rewrites primary on rename of a top-level node', () => {
    const next = rewriteRulesForRename(rules, ['Mat og drikke'], 'Mat');
    expect(next.find((r) => r.id === '1')!.category).toEqual(['Mat', 'Dagligvarer']);
    expect(next.find((r) => r.id === '3')!.category).toEqual(['Mat', 'Restaurant']);
    expect(next.find((r) => r.id === '2')!.category).toEqual(['Reise', 'Tog']);
  });

  it('rewrites sub on rename of a depth-1 node (matched by [primary, oldSub])', () => {
    const next = rewriteRulesForRename(rules, ['Mat og drikke', 'Dagligvarer'], 'Mat-D');
    expect(next.find((r) => r.id === '1')!.category).toEqual(['Mat og drikke', 'Mat-D']);
    expect(next.find((r) => r.id === '3')!.category).toEqual(['Mat og drikke', 'Restaurant']);
  });

  it('does nothing on rename of a depth>=2 node (rules cannot reference deeper nodes)', () => {
    const next = rewriteRulesForRename(rules, ['Mat og drikke', 'Dagligvarer', 'Rema 1000'], 'Rema');
    expect(next).toEqual(rules);
  });
});

describe('rewriteMappingsForRename', () => {
  const mappings: Record<string, [string, string]> = {
    '5411': ['Mat og drikke', 'Dagligvarer'],
    '5812': ['Mat og drikke', 'Restaurant'],
    '4111': ['Reise', 'Tog'],
  };

  it('rewrites primary on rename', () => {
    const next = rewriteMappingsForRename(mappings, ['Mat og drikke'], 'Mat');
    expect(next['5411']).toEqual(['Mat', 'Dagligvarer']);
    expect(next['5812']).toEqual(['Mat', 'Restaurant']);
    expect(next['4111']).toEqual(['Reise', 'Tog']);
  });

  it('rewrites sub on depth-1 rename', () => {
    const next = rewriteMappingsForRename(mappings, ['Mat og drikke', 'Dagligvarer'], 'Mat-D');
    expect(next['5411']).toEqual(['Mat og drikke', 'Mat-D']);
    expect(next['5812']).toEqual(['Mat og drikke', 'Restaurant']);
  });
});

describe('collectAffectedRules', () => {
  const rules: TextPatternRule[] = [
    { id: '1', type: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
    { id: '2', type: 'substring', pattern: 'B', category: ['Reise', 'Tog'] },
  ];

  it('finds rules for a deleted top-level subtree', () => {
    expect(collectAffectedRules(rules, baseTree(), [0]).map((r) => r.id)).toEqual(['1']);
  });

  it('finds rules for a deleted depth-1 node', () => {
    expect(collectAffectedRules(rules, baseTree(), [0, 0]).map((r) => r.id)).toEqual(['1']);
  });

  it('returns empty for deeper deletes (rules cannot match)', () => {
    expect(collectAffectedRules(rules, baseTree(), [0, 0, 0])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /workspace/v2/frontend && pnpm test categoryEdit`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Implement `categoryEdit.ts`**

Create `v2/frontend/src/services/categoryEdit.ts`:

```ts
import type { CategoryNode, CategoryTree, TextPatternRule } from '../../../shared/types';

export type Path = number[];

function cloneNode(n: CategoryNode): CategoryNode {
  const clone: CategoryNode = { name: n.name, children: n.children.map(cloneNode) };
  if (n.emoji) clone.emoji = n.emoji;
  return clone;
}

function cloneTree(t: CategoryTree): CategoryTree {
  return t.map(cloneNode);
}

export function getNodeAt(tree: CategoryTree, path: Path): CategoryNode {
  if (path.length === 0) throw new Error('empty path');
  let nodes: CategoryNode[] = tree;
  let node: CategoryNode | undefined;
  for (const idx of path) {
    node = nodes[idx];
    if (!node) throw new Error(`invalid path: index ${idx} out of bounds`);
    nodes = node.children;
  }
  return node!;
}

function getParentChildren(tree: CategoryTree, path: Path): CategoryNode[] {
  if (path.length === 0) throw new Error('empty path');
  if (path.length === 1) return tree;
  let nodes: CategoryNode[] = tree;
  for (let i = 0; i < path.length - 1; i++) nodes = nodes[path[i]].children;
  return nodes;
}

export function countDescendants(node: CategoryNode): number {
  let n = 0;
  for (const c of node.children) n += 1 + countDescendants(c);
  return n;
}

export function renameAt(tree: CategoryTree, path: Path, newName: string): CategoryTree {
  const next = cloneTree(tree);
  const siblings = getParentChildren(next, path);
  const idx = path[path.length - 1];
  const node = siblings[idx];
  if (newName === node.name) return next;
  if (siblings.some((s, i) => i !== idx && s.name === newName)) {
    throw new Error(`A sibling called "${newName}" already exists`);
  }
  node.name = newName;
  return next;
}

export interface AddChildResult {
  tree: CategoryTree;
  path: Path;
}

export function addChildAt(
  tree: CategoryTree,
  path: Path,
  childName: string,
  opts?: { withPath?: false }
): CategoryTree;
export function addChildAt(
  tree: CategoryTree,
  path: Path,
  childName: string,
  opts: { withPath: true }
): AddChildResult;
export function addChildAt(
  tree: CategoryTree,
  path: Path,
  childName: string,
  opts?: { withPath?: boolean }
): CategoryTree | AddChildResult {
  const next = cloneTree(tree);
  const parent = getNodeAt(next, path);
  if (parent.children.some((c) => c.name === childName)) {
    throw new Error(`A child called "${childName}" already exists under "${parent.name}"`);
  }
  parent.children.push({ name: childName, children: [] });
  if (opts?.withPath) {
    return { tree: next, path: [...path, parent.children.length - 1] };
  }
  return next;
}

export interface AddRootResult {
  tree: CategoryTree;
  path: Path;
}

export function addRoot(
  tree: CategoryTree,
  name: string,
  emoji?: string
): AddRootResult {
  if (tree.some((n) => n.name === name)) {
    throw new Error(`A primary called "${name}" already exists`);
  }
  const next = cloneTree(tree);
  const node: CategoryNode = { name, children: [] };
  if (emoji) node.emoji = emoji;
  next.push(node);
  return { tree: next, path: [next.length - 1] };
}

export function deleteAt(tree: CategoryTree, path: Path): CategoryTree {
  const next = cloneTree(tree);
  const siblings = getParentChildren(next, path);
  siblings.splice(path[path.length - 1], 1);
  return next;
}

export function reorderSiblings(tree: CategoryTree, path: Path, targetIdx: number): CategoryTree {
  const next = cloneTree(tree);
  const siblings = getParentChildren(next, path);
  const fromIdx = path[path.length - 1];
  const clamped = Math.max(0, Math.min(siblings.length - 1, targetIdx));
  if (clamped === fromIdx) return next;
  const [moved] = siblings.splice(fromIdx, 1);
  siblings.splice(clamped, 0, moved);
  return next;
}

export function setEmojiAt(tree: CategoryTree, path: Path, emoji: string): CategoryTree {
  const next = cloneTree(tree);
  const node = getNodeAt(next, path);
  node.emoji = emoji;
  return next;
}

export function pathOfPrimaryByName(tree: CategoryTree, name: string): Path | null {
  const idx = tree.findIndex((n) => n.name === name);
  return idx === -1 ? null : [idx];
}

// Rules and merchant mappings reference categories as 2-tuples [primary, sub].
// Renames at depth 0 or 1 must rewrite those references; deeper renames are
// invisible to rules.

function categoryMatchesRename(
  category: [string, string],
  oldPath: Path,
  oldName: string,
  treeBeforeRename: CategoryTree
): boolean {
  if (oldPath.length === 1) {
    return category[0] === oldName;
  }
  if (oldPath.length === 2) {
    const primaryName = treeBeforeRename[oldPath[0]]?.name;
    return category[0] === primaryName && category[1] === oldName;
  }
  return false;
}

function applyRenameToCategory(
  category: [string, string],
  oldPath: Path,
  newName: string
): [string, string] {
  if (oldPath.length === 1) return [newName, category[1]];
  if (oldPath.length === 2) return [category[0], newName];
  return category;
}

// Public: rewrite rules. Pass the tree state BEFORE the rename so we can
// resolve the old name from the path.
export function rewriteRulesForRename(
  rules: TextPatternRule[],
  oldPathOrPath: Path,
  newName: string,
  treeBeforeRename?: CategoryTree
): TextPatternRule[] {
  // Convenience: when called from tests with just (rules, oldPath, newName)
  // and the oldPath embeds the old name as its last segment alongside an
  // index-style path, we accept a string-array path too. Here `oldPath` is
  // a real index path; we need treeBeforeRename to resolve names. If no
  // tree is provided, derive from oldPath last segment treated as a name —
  // but that's only valid for tests. For safety: require treeBeforeRename
  // when oldPath.length >= 2.
  if (oldPathOrPath.length === 0) return rules;
  // Tests pass strings via the convenience overload below; this signature
  // is used in production.
  // (no-op here — see overload)
  return rules.map((r) => {
    if (categoryMatchesRename(r.category, oldPathOrPath, '__missing__', treeBeforeRename ?? [])) {
      return { ...r, category: applyRenameToCategory(r.category, oldPathOrPath, newName) };
    }
    return r;
  });
}
```

The implementation above has a flaw — let me design it more cleanly. **Replace the bottom of the file** (everything from the second `categoryMatchesRename` declaration onward) with this string-path API that the tests target:

```ts
// String-path API: each segment is a category name. Deeper paths refer to
// nodes that rules cannot reference (rules are 2-tuples), so renames there
// pass through unchanged.

export type NamePath = string[];

export function rewriteRulesForRename(
  rules: TextPatternRule[],
  oldNamePath: NamePath,
  newName: string
): TextPatternRule[] {
  if (oldNamePath.length === 1) {
    const [oldPrimary] = oldNamePath;
    return rules.map((r) =>
      r.category[0] === oldPrimary ? { ...r, category: [newName, r.category[1]] } : r
    );
  }
  if (oldNamePath.length === 2) {
    const [oldPrimary, oldSub] = oldNamePath;
    return rules.map((r) =>
      r.category[0] === oldPrimary && r.category[1] === oldSub
        ? { ...r, category: [r.category[0], newName] }
        : r
    );
  }
  return rules;
}

export function rewriteMappingsForRename(
  mappings: Record<string, [string, string]>,
  oldNamePath: NamePath,
  newName: string
): Record<string, [string, string]> {
  if (oldNamePath.length === 1) {
    const [oldPrimary] = oldNamePath;
    const out: Record<string, [string, string]> = {};
    for (const [k, [p, s]] of Object.entries(mappings)) {
      out[k] = p === oldPrimary ? [newName, s] : [p, s];
    }
    return out;
  }
  if (oldNamePath.length === 2) {
    const [oldPrimary, oldSub] = oldNamePath;
    const out: Record<string, [string, string]> = {};
    for (const [k, [p, s]] of Object.entries(mappings)) {
      out[k] = p === oldPrimary && s === oldSub ? [p, newName] : [p, s];
    }
    return out;
  }
  return mappings;
}

// Helper to convert an index-Path to a name-NamePath for the tree state
// before mutation.
export function namePathOf(tree: CategoryTree, path: Path): NamePath {
  const out: string[] = [];
  let nodes: CategoryNode[] = tree;
  for (const idx of path) {
    out.push(nodes[idx].name);
    nodes = nodes[idx].children;
  }
  return out;
}

// Collect rules whose category is referenced inside the subtree at `path`.
// Used to surface "X dependent rules" before a delete.
export function collectAffectedRules(
  rules: TextPatternRule[],
  tree: CategoryTree,
  path: Path
): TextPatternRule[] {
  if (path.length >= 3) return [];
  const node = getNodeAt(tree, path);
  if (path.length === 1) {
    return rules.filter((r) => r.category[0] === node.name);
  }
  // depth 1: match exact (primary, sub)
  const primary = tree[path[0]].name;
  return rules.filter((r) => r.category[0] === primary && r.category[1] === node.name);
}

export function collectAffectedMappings(
  mappings: Record<string, [string, string]>,
  tree: CategoryTree,
  path: Path
): string[] {
  if (path.length >= 3) return [];
  const node = getNodeAt(tree, path);
  if (path.length === 1) {
    return Object.keys(mappings).filter((k) => mappings[k][0] === node.name);
  }
  const primary = tree[path[0]].name;
  return Object.keys(mappings).filter(
    (k) => mappings[k][0] === primary && mappings[k][1] === node.name
  );
}

export function deleteFromMappings(
  mappings: Record<string, [string, string]>,
  affectedKeys: string[]
): Record<string, [string, string]> {
  if (affectedKeys.length === 0) return mappings;
  const out: Record<string, [string, string]> = {};
  for (const [k, v] of Object.entries(mappings)) {
    if (!affectedKeys.includes(k)) out[k] = v;
  }
  return out;
}
```

Remove the broken overload-based `rewriteRulesForRename` from the earlier draft; only the name-path API survives. The exported surface is:

```
getNodeAt, countDescendants, renameAt, addChildAt, addRoot, deleteAt,
reorderSiblings, setEmojiAt, pathOfPrimaryByName, namePathOf,
rewriteRulesForRename, rewriteMappingsForRename, collectAffectedRules,
collectAffectedMappings, deleteFromMappings
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /workspace/v2/frontend && pnpm test categoryEdit`
Expected: PASS — all 16+ tests green.

- [ ] **Step 5: Commit**

```bash
git add v2/frontend/src/services/categoryEdit.ts v2/frontend/src/services/categoryEdit.test.ts
git commit -m "feat: categoryEdit pure-function service for tree mutation"
```

---

## Task 3: StatisticsTable edit-mode shell

Adds the toggle button, hint banner, full-tree merge logic, and the basic edit-mode container. No editing actions yet — that's tasks 4 and 5.

**Files:**
- Modify: `v2/frontend/src/components/StatisticsTable.tsx`
- Modify: `v2/frontend/src/styles/index.css`

- [ ] **Step 1: Add merge helper + edit prop plumbing**

In `v2/frontend/src/components/StatisticsTable.tsx`, before `function StatisticsTable`:

```ts
import { useConfig } from '../context/useConfig';
import type { CategoryTree, CategoryNode } from '../../../shared/types';

function buildEditTreeNodes(
  configTree: CategoryTree,
  amountsByPath: Map<string, { periodTotals: number[]; sum: number; average: number }>
): CategoryTreeNode[] {
  function walk(nodes: CategoryNode[], parentPath: string[]): CategoryTreeNode[] {
    return nodes.map((n) => {
      const segments = [...parentPath, n.name];
      const path = segments.join('/');
      const amounts = amountsByPath.get(segments.join(' ➡ '));
      const children = walk(n.children, segments);
      const periodTotals = amounts
        ? amounts.periodTotals
        : children.length > 0
          ? children[0].periodTotals.map((_, i) =>
              children.reduce((s, c) => s + c.periodTotals[i], 0)
            )
          : [];
      const sum = amounts ? amounts.sum : periodTotals.reduce((a, b) => a + b, 0);
      const periodCount = periodTotals.length;
      const average = amounts ? amounts.average : periodCount > 0 ? sum / periodCount : 0;
      return {
        name: n.name,
        path,
        depth: parentPath.length,
        periodTotals,
        sum,
        average,
        children,
      };
    });
  }
  return walk(configTree, []);
}

function flattenAmountsByJoinedName(stats: GroupedStatistics): Map<string, { periodTotals: number[]; sum: number; average: number }> {
  const map = new Map<string, { periodTotals: number[]; sum: number; average: number }>();
  for (const row of stats.rawTableData) {
    map.set(row.category, {
      periodTotals: row.periodTotals,
      sum: row.sum,
      average: row.average,
    });
  }
  return map;
}
```

- [ ] **Step 2: Toggle state + tree selection inside `StatisticsTable`**

Inside the component, after the existing `useState` lines:

```ts
const { config } = useConfig();
const [editing, setEditing] = useState(false);

const editTree = useMemo(() => {
  const amounts = flattenAmountsByJoinedName(statistics);
  return buildEditTreeNodes(config.categories, amounts);
}, [statistics, config.categories]);

const treeForRender = editing ? editTree : categoryTree;
```

Replace `categoryTree` in the `visibleRows` `useMemo` and any subsequent uses with `treeForRender`. The `expandAll`, `collapseAll`, `expandOneLevel`, `collapseOneLevel` should also use `treeForRender` so toggling edit mode doesn't break expansion controls.

- [ ] **Step 3: Render the toggle + hint banner**

In the JSX, replace the existing `.statistics-controls-bar` with:

```tsx
<div className="statistics-controls-bar">
  <div className="control-group">
    <button onClick={collapseOneLevel}>Collapse</button>
    <button onClick={expandOneLevel}>Expand</button>
  </div>
  <div className="control-group">
    <button onClick={collapseAll}>Collapse All</button>
    <button onClick={expandAll}>Expand All</button>
  </div>
  <button
    className={heatmapEnabled ? 'active' : ''}
    onClick={() => setHeatmapEnabled((prev) => !prev)}
  >
    Heatmap
  </button>
  <button
    type="button"
    className={`edit-toggle${editing ? ' active' : ''}`}
    onClick={() => setEditing((v) => !v)}
    aria-pressed={editing}
    data-testid="cat-edit-toggle"
  >
    <span className="switch-pill" />
    <span>{editing ? '✏️ Editing' : '✏️ Edit categories'}</span>
  </button>
</div>
{editing && (
  <div className="cat-edit-hint" role="status">
    Edit mode active. Click a name to rename · Hover a row for <strong>+</strong> (add child) and <strong>×</strong> (delete) · Drag <span className="drag-glyph">⋮⋮</span> to reorder within siblings · <kbd>Esc</kbd> exits
  </div>
)}
```

Wrap the `<div className="table-wrapper">` to receive the editing class:

```tsx
<div className={`table-wrapper${editing ? ' editing' : ''}`}>
  <table>
    {/* ... existing thead/tbody, but each row also receives data-path ... */}
  </table>
</div>
```

- [ ] **Step 4: Add data-path to rows and depth-aware indent**

Each `<tr>` in the body now needs a `data-path` attribute (the joined index path) to support actions in later tasks. Update the row mapping:

```tsx
{visibleRows.map(({ node, depth, hasChildren, isExpanded, indexPath }) => (
  <tr
    key={node.path}
    className={`depth-${Math.min(depth, 3)}`}
    data-path={indexPath.join('.')}
  >
    {/* ... */}
  </tr>
))}
```

The `VisibleRow` interface gains an `indexPath: number[]` field. `collectVisibleRows` is updated to pass it:

```ts
interface VisibleRow {
  node: CategoryTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  indexPath: number[];
}

function collectVisibleRows(
  nodes: CategoryTreeNode[],
  depth: number,
  expandState: Record<string, boolean>,
  parentPath: number[] = []
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const indexPath = [...parentPath, i];
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && !!expandState[node.path];
    rows.push({ node, depth, hasChildren, isExpanded, indexPath });
    if (isExpanded) {
      rows.push(...collectVisibleRows(node.children, depth + 1, expandState, indexPath));
    }
  }
  return rows;
}
```

- [ ] **Step 5: Auto-expand all when edit mode is on**

When entering edit mode, expand the full tree so the user can see and edit anything. When leaving, restore the prior state.

Inside the component:

```ts
const [savedExpand, setSavedExpand] = useState<Record<string, boolean> | null>(null);

useEffect(() => {
  if (editing) {
    setSavedExpand(expandState);
    const all: Record<string, boolean> = {};
    function walk(nodes: CategoryTreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          all[n.path] = true;
          walk(n.children);
        }
      }
    }
    walk(treeForRender);
    setExpandState(all);
  } else if (savedExpand != null) {
    setExpandState(savedExpand);
    setSavedExpand(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editing]);
```

- [ ] **Step 6: Add Esc-to-exit handler**

```ts
useEffect(() => {
  if (!editing) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !document.querySelector('.cat-name-input')) {
      setEditing(false);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [editing]);
```

- [ ] **Step 7: CSS for toggle + banner + editing container**

Append to `v2/frontend/src/styles/index.css` (somewhere after the `.statistics-controls-bar` block):

```css
/* Edit toggle pill */
.statistics-controls-bar .edit-toggle {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.75rem; border-radius: 999px;
  border: 1px solid var(--border-color, #e5e7eb);
  background: var(--surface, #fff); color: var(--text-primary);
  font: inherit; cursor: pointer;
}
.statistics-controls-bar .edit-toggle:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
}
.statistics-controls-bar .edit-toggle.active {
  background: var(--primary-color); color: #fff; border-color: var(--primary-color);
}
.statistics-controls-bar .edit-toggle .switch-pill {
  width: 28px; height: 14px; background: rgba(0,0,0,0.15); border-radius: 999px;
  position: relative; transition: background 0.2s;
}
.statistics-controls-bar .edit-toggle .switch-pill::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.statistics-controls-bar .edit-toggle.active .switch-pill { background: rgba(255,255,255,0.4); }
.statistics-controls-bar .edit-toggle.active .switch-pill::after { transform: translateX(14px); }

/* Hint banner */
.cat-edit-hint {
  background: #fef3c7; color: #92400e;
  padding: 0.5rem 0.75rem; border-radius: 8px 8px 0 0;
  font-size: 0.8rem;
}
[data-theme="dark"] .cat-edit-hint {
  background: rgba(251,191,36,0.12); color: #fbbf24;
}
.cat-edit-hint kbd {
  background: var(--surface, #fff); border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 4px; padding: 0 0.3rem; font-family: monospace; font-size: 0.75rem;
}
.cat-edit-hint .drag-glyph { font-family: monospace; }

/* Subtle indication that the table is in edit mode */
.table-wrapper.editing {
  background: rgba(99,102,241,0.04);
  border-radius: 0 0 8px 8px;
}
[data-theme="dark"] .table-wrapper.editing { background: rgba(129,140,248,0.06); }
```

- [ ] **Step 8: Verify build + manual smoke test**

Run: `cd /workspace/v2/frontend && pnpm run build`
Expected: build passes.

Run: `make ci`
Expected: existing unit + E2E tests still green (we haven't introduced new behaviour into the prod path yet — the toggle should be visible but inert).

- [ ] **Step 9: Commit**

```bash
git add v2/frontend/src/components/StatisticsTable.tsx v2/frontend/src/styles/index.css
git commit -m "feat(stats): edit-mode toggle + full-tree render scaffold"
```

---

## Task 4: Inline rename, add-child, delete-subtree

**Files:**
- Modify: `v2/frontend/src/components/StatisticsTable.tsx`
- Modify: `v2/frontend/src/styles/index.css`

- [ ] **Step 1: Render edit chrome on each row when editing**

Within the row mapping, when `editing` is `true`, augment the category cell:

```tsx
<td onClick={!editing && hasChildren ? () => toggleNode(node.path) : undefined}>
  <div className="cat-content">
    <span className="indent" style={{ width: depth * 16 }} />
    {editing && <span className="drag-handle" data-drag-handle title="Drag to reorder">⋮⋮</span>}
    {hasChildren ? (
      <span className={`chevron${isExpanded ? ' open' : ''}`}>▶</span>
    ) : (
      <span className="no-chevron" />
    )}
    {/* emoji slot left for Task 5; current iteration shows existing emoji if any */}
    {depth === 0 && (
      <span className="cat-emoji" data-emoji-path={indexPath.join('.')}>
        {findEmojiForRoot(config.categories, indexPath[0]) ?? ''}
      </span>
    )}
    {editing ? (
      <span
        className="cat-name editable"
        data-rename-path={indexPath.join('.')}
        onClick={(e) => {
          e.stopPropagation();
          startRename(indexPath, node.name);
        }}
      >
        {node.name}
      </span>
    ) : (
      <span>{node.name}</span>
    )}
    {editing && (
      <span className="row-actions">
        <button
          type="button"
          className="icon-btn add"
          title={`Add child under ${node.name}`}
          onClick={() => onAddChild(indexPath, node.name)}
          data-testid={`cat-add-${indexPath.join('-')}`}
        >+</button>
        <button
          type="button"
          className="icon-btn danger"
          title={`Delete ${node.name}${
            countDescendantsTreeNode(node) > 0 ? ` (with ${countDescendantsTreeNode(node)} descendants)` : ''
          }`}
          onClick={() => onDelete(indexPath, node.name)}
          data-testid={`cat-delete-${indexPath.join('-')}`}
        >×</button>
      </span>
    )}
  </div>
</td>
```

Where `findEmojiForRoot(tree, idx)` returns `tree[idx]?.emoji` and `countDescendantsTreeNode(node)` returns `node.children.reduce(...)` recursive count.

- [ ] **Step 2: Active rename input**

Add `renameTarget` state:

```ts
const [renameTarget, setRenameTarget] = useState<{ path: number[]; initial: string } | null>(null);

const startRename = useCallback((path: number[], initial: string) => {
  setRenameTarget({ path, initial });
}, []);

const commitRename = useCallback((newName: string) => {
  if (!renameTarget) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === renameTarget.initial) {
    setRenameTarget(null);
    return;
  }
  try {
    const oldNamePath = namePathOf(config.categories, renameTarget.path);
    const newTree = renameAt(config.categories, renameTarget.path, trimmed);
    const newRules = rewriteRulesForRename(config.rules.textPatternRules, oldNamePath, trimmed);
    const newMappings = rewriteMappingsForRename(config.rules.merchantCodeMappings, oldNamePath, trimmed);
    updateCategories(newTree);
    if (newRules !== config.rules.textPatternRules) updateRules(newRules);
    if (newMappings !== config.rules.merchantCodeMappings) updateMerchantMappings(newMappings);
  } catch (err) {
    showToast((err as Error).message);
  }
  setRenameTarget(null);
}, [renameTarget, config.categories, config.rules.textPatternRules, config.rules.merchantCodeMappings, updateCategories, updateRules, updateMerchantMappings, showToast]);
```

`useConfig()` already exposes `updateCategories`, `updateRules`, `updateMerchantMappings`. `showToast` is added via prop or imported singleton. Easiest: lift `showToast` to a prop `onToast?: (msg: string) => void` passed from `App.tsx`.

In the row, when this row is the rename target, render an `<input>` instead of the span:

```tsx
{renameTarget?.path.join('.') === indexPath.join('.') ? (
  <input
    autoFocus
    defaultValue={renameTarget.initial}
    className="cat-name-input"
    onKeyDown={(e) => {
      if (e.key === 'Enter') { e.preventDefault(); commitRename((e.target as HTMLInputElement).value); }
      else if (e.key === 'Escape') { e.preventDefault(); setRenameTarget(null); }
    }}
    onBlur={(e) => commitRename(e.target.value)}
  />
) : (
  <span className="cat-name editable" /* ... */>{node.name}</span>
)}
```

- [ ] **Step 3: Add child handler**

```ts
const onAddChild = useCallback((parentPath: number[], parentName: string) => {
  let cand = 'New category';
  let n = 1;
  const parent = getNodeAt(config.categories, parentPath);
  while (parent.children.some((c) => c.name === cand)) { n++; cand = `New category ${n}`; }
  try {
    const { tree, path } = addChildAt(config.categories, parentPath, cand, { withPath: true });
    updateCategories(tree);
    // Defer focus until the new row exists
    setTimeout(() => setRenameTarget({ path, initial: cand }), 0);
  } catch (err) {
    showToast((err as Error).message);
  }
}, [config.categories, updateCategories, showToast]);
```

- [ ] **Step 4: Delete subtree handler with cascade**

```ts
const onDelete = useCallback((path: number[], name: string) => {
  const node = getNodeAt(config.categories, path);
  const desc = countDescendants(node);
  const affectedRules = collectAffectedRules(config.rules.textPatternRules, config.categories, path);
  const affectedMappingKeys = collectAffectedMappings(config.rules.merchantCodeMappings, config.categories, path);
  const detail: string[] = [];
  if (desc > 0) detail.push(`${desc} descendant${desc === 1 ? '' : 's'}`);
  if (affectedRules.length > 0) detail.push(`${affectedRules.length} rule${affectedRules.length === 1 ? '' : 's'}`);
  if (affectedMappingKeys.length > 0) detail.push(`${affectedMappingKeys.length} merchant mapping${affectedMappingKeys.length === 1 ? '' : 's'}`);
  const detailStr = detail.length > 0 ? ` (along with ${detail.join(', ')})` : '';
  if (!confirm(`Delete "${name}"${detailStr}?`)) return;

  const newTree = deleteAt(config.categories, path);
  const newRules = config.rules.textPatternRules.filter((r) => !affectedRules.includes(r));
  const newMappings = deleteFromMappings(config.rules.merchantCodeMappings, affectedMappingKeys);

  updateCategories(newTree);
  if (newRules !== config.rules.textPatternRules) updateRules(newRules);
  if (newMappings !== config.rules.merchantCodeMappings) updateMerchantMappings(newMappings);
  showToast(`Deleted "${name}"`);
}, [config.categories, config.rules.textPatternRules, config.rules.merchantCodeMappings, updateCategories, updateRules, updateMerchantMappings, showToast]);
```

- [ ] **Step 5: Add-primary row at the bottom**

In the `<tbody>`, after the visible rows but before `<tr className="sum">`, append an "add primary" row when editing:

```tsx
{editing && (
  <tr className="add-primary-row">
    <td colSpan={2 + yearMonths.length}>
      <button
        type="button"
        className="add-primary-btn"
        data-testid="cat-add-primary"
        onClick={() => {
          let cand = 'New category', n = 1;
          while (config.categories.some((c) => c.name === cand)) { n++; cand = `New category ${n}`; }
          try {
            const { tree, path } = addRoot(config.categories, cand, '📁');
            updateCategories(tree);
            setTimeout(() => setRenameTarget({ path, initial: cand }), 0);
          } catch (err) {
            showToast((err as Error).message);
          }
        }}
      >
        + Add primary category
      </button>
    </td>
  </tr>
)}
```

- [ ] **Step 6: CSS for row chrome**

Append:

```css
/* Drag handle */
.cat-content .drag-handle {
  display: inline-block; width: 14px; user-select: none;
  color: var(--text-secondary, #6b7280); cursor: grab; opacity: 0;
  transition: opacity 0.15s;
}
.table-wrapper.editing .cat-content .drag-handle { opacity: 0.5; }
.table-wrapper.editing tr:hover .cat-content .drag-handle { opacity: 1; }

/* Inline name affordance */
.cat-content .cat-name.editable {
  cursor: text; padding: 0.1rem 0.3rem; border-radius: 4px;
  border: 1px dashed transparent;
}
.table-wrapper.editing .cat-content .cat-name.editable:hover {
  border-color: rgba(99,102,241,0.4);
  background: var(--primary-light);
}

.cat-content .cat-name-input {
  flex: 1; min-width: 0;
  background: var(--surface, #fff);
  border: 1px solid var(--primary-color);
  border-radius: 6px; padding: 0.15rem 0.4rem;
  font: inherit; color: var(--text-primary); outline: none;
}

/* Row actions */
.cat-content .row-actions {
  display: inline-flex; gap: 0.1rem; margin-left: 0.4rem;
  opacity: 0; transition: opacity 0.15s;
}
.table-wrapper.editing tr:hover .cat-content .row-actions { opacity: 1; }
.cat-content .icon-btn {
  background: transparent; border: 0; color: var(--text-secondary, #6b7280);
  width: 22px; height: 22px; border-radius: 4px; cursor: pointer;
  font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: center;
}
.cat-content .icon-btn:hover { background: var(--primary-light); color: var(--text-primary); }
.cat-content .icon-btn.danger:hover { color: #ef4444; }
.cat-content .icon-btn.add:hover { color: var(--primary-color); }

/* Add-primary footer row */
tr.add-primary-row td {
  padding: 0.5rem;
  background: rgba(99,102,241,0.04);
}
.add-primary-btn {
  background: transparent; border: 1px dashed var(--border-color, #e5e7eb);
  color: var(--text-secondary, #6b7280); padding: 0.35rem 0.75rem;
  border-radius: 6px; cursor: pointer; font: inherit;
}
.add-primary-btn:hover {
  border-color: var(--primary-color); color: var(--primary-color);
}

.cat-content .cat-emoji {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; flex-shrink: 0;
}
```

- [ ] **Step 7: Smoke verify (manual + lint/build)**

Run: `cd /workspace/v2/frontend && pnpm run build`
Expected: passes.

Run: `cd /workspace/v2/frontend && pnpm run lint`
Expected: clean.

Run: `make ci`
Expected: all unit + E2E tests still pass (no E2E coverage of edit mode yet — that comes in Task 7).

- [ ] **Step 8: Commit**

```bash
git add v2/frontend/src/components/StatisticsTable.tsx v2/frontend/src/styles/index.css v2/frontend/src/App.tsx
git commit -m "feat(stats): inline rename, add-child, delete-subtree with rule cascade"
```

---

## Task 5: Drag-reorder among siblings + emoji picker

**Files:**
- Modify: `v2/frontend/src/components/StatisticsTable.tsx`
- Modify: `v2/frontend/src/styles/index.css`

- [ ] **Step 1: Drag-reorder via mouse events**

Add at top of component:

```ts
const dragRef = useRef<{ path: number[] } | null>(null);
const tbodyRef = useRef<HTMLTableSectionElement>(null);

useEffect(() => {
  if (!editing) return;
  const tbody = tbodyRef.current;
  if (!tbody) return;
  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.matches('[data-drag-handle]')) return;
    const tr = target.closest('tr[data-path]') as HTMLTableRowElement | null;
    if (!tr) return;
    dragRef.current = { path: tr.dataset.path!.split('.').map(Number) };
    tr.style.opacity = '0.5';
    e.preventDefault();
  };
  const onMouseMove = (e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const sourcePath = drag.path;
    const parentPrefix = sourcePath.slice(0, -1).join('.');
    const siblingRows = Array.from(
      tbody.querySelectorAll<HTMLTableRowElement>('tr[data-path]')
    ).filter((r) => {
      const p = r.dataset.path!.split('.').map(Number);
      return p.length === sourcePath.length && p.slice(0, -1).join('.') === parentPrefix;
    });
    const target = siblingRows.find((r) => {
      const rect = r.getBoundingClientRect();
      return e.clientY >= rect.top && e.clientY <= rect.bottom;
    });
    if (!target) return;
    const targetPath = target.dataset.path!.split('.').map(Number);
    const sourceIdx = sourcePath[sourcePath.length - 1];
    const targetIdx = targetPath[targetPath.length - 1];
    if (sourceIdx === targetIdx) return;
    const next = reorderSiblings(config.categories, sourcePath, targetIdx);
    updateCategories(next);
    drag.path = [...sourcePath.slice(0, -1), targetIdx];
  };
  const onMouseUp = () => {
    if (!dragRef.current) return;
    const tr = tbody.querySelector<HTMLTableRowElement>(
      `tr[data-path="${dragRef.current.path.join('.')}"]`
    );
    if (tr) tr.style.opacity = '';
    dragRef.current = null;
  };
  tbody.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  return () => {
    tbody.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}, [editing, config.categories, updateCategories]);
```

Add `ref={tbodyRef}` to `<tbody>`.

- [ ] **Step 2: Emoji picker for top-level rows**

A small popup with the existing prototype's emoji set. Add module-scoped:

```ts
const EMOJI_SET = ['🍔','🍕','🥗','☕','🍷','🛒','🛍️','👕','👟','🏠','🛋️','🔧','✈️','🚆','🚗','🚕','🏨','💵','💳','🏦','📱','💻','🎬','🎮','📚','🏋️','⚽','🎨','🎵','🐾','🌿','🎁','📦','💼','🏥','💊','✏️','📝','💡','🌍'];
```

State:

```ts
const [emojiPicker, setEmojiPicker] = useState<{ rect: DOMRect; path: number[] } | null>(null);
```

Render the emoji slot for top-level rows as a button when editing:

```tsx
{editing && depth === 0 ? (
  <button
    type="button"
    className="emoji-btn editable"
    onClick={(e) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setEmojiPicker({ rect, path: indexPath });
    }}
    data-testid={`cat-emoji-${indexPath.join('-')}`}
  >
    {findEmojiForRoot(config.categories, indexPath[0]) ?? '·'}
  </button>
) : depth === 0 ? (
  <span className="cat-emoji">{findEmojiForRoot(config.categories, indexPath[0]) ?? ''}</span>
) : null}
```

Render the picker as a portal-less floating popup:

```tsx
{emojiPicker && (
  <div
    className="emoji-picker open"
    style={{
      position: 'fixed',
      top: emojiPicker.rect.bottom + 4,
      left: emojiPicker.rect.left,
    }}
    onMouseDown={(e) => e.stopPropagation()}
  >
    {EMOJI_SET.map((em) => (
      <button
        key={em}
        type="button"
        onClick={() => {
          const next = setEmojiAt(config.categories, emojiPicker.path, em);
          updateCategories(next);
          setEmojiPicker(null);
        }}
      >
        {em}
      </button>
    ))}
  </div>
)}
```

Close on outside click:

```ts
useEffect(() => {
  if (!emojiPicker) return;
  const onDown = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest('.emoji-picker') && !t.closest('.emoji-btn')) setEmojiPicker(null);
  };
  setTimeout(() => document.addEventListener('mousedown', onDown), 0);
  return () => document.removeEventListener('mousedown', onDown);
}, [emojiPicker]);
```

- [ ] **Step 3: CSS for emoji picker + emoji button**

```css
.cat-content .emoji-btn {
  background: transparent; border: 1px solid transparent;
  border-radius: 6px; width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1rem; cursor: default; flex-shrink: 0;
}
.table-wrapper.editing .cat-content .emoji-btn.editable {
  cursor: pointer; border-color: var(--border-color, #e5e7eb);
  background: var(--surface, #fff);
}
.table-wrapper.editing .cat-content .emoji-btn.editable:hover {
  border-color: var(--primary-color); background: var(--primary-light);
}
.emoji-picker {
  background: var(--surface, #fff); border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px; padding: 0.4rem;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
  display: grid; grid-template-columns: repeat(8, 30px); gap: 0.15rem;
  z-index: 1100;
}
.emoji-picker button {
  width: 30px; height: 30px;
  background: transparent; border: 1px solid transparent; border-radius: 6px;
  cursor: pointer; font-size: 1.05rem;
}
.emoji-picker button:hover {
  background: var(--primary-light); border-color: var(--border-color, #e5e7eb);
}
```

- [ ] **Step 4: Build + lint**

Run: `cd /workspace/v2/frontend && pnpm run build && pnpm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add v2/frontend/src/components/StatisticsTable.tsx v2/frontend/src/styles/index.css
git commit -m "feat(stats): drag-reorder siblings, emoji picker, add-primary row"
```

---

## Task 6: Wire `CategoryDropdown` to `config.categories`

The picker currently derives primaries/subs from `merchantCodeMappings`. After tree-edits, deletes/renames must be reflected in the picker.

**Files:**
- Modify: `v2/frontend/src/components/CategoryDropdown.tsx`
- Modify: `v2/frontend/src/App.tsx`

- [ ] **Step 1: Change `CategoryDropdown` to take a tree**

Replace the props type and the primary/sub derivation:

```ts
import type { CategoryTree, TextPatternRule } from '../../../shared/types';

interface CategoryDropdownProps {
  anchor: DOMRect;
  categories: CategoryTree;
  existingRule?: TextPatternRule;
  onPick: (primary: string, sub: string) => void;
  onRemove: () => void;
  onClose: () => void;
}
```

```ts
const primaries = useMemo(() => categories.map((n) => n.name), [categories]);
const subs = useMemo(() => {
  if (!selectedPrimary) return [];
  const node = categories.find((n) => n.name === selectedPrimary);
  return node ? node.children.map((c) => c.name) : [];
}, [categories, selectedPrimary]);
```

- [ ] **Step 2: Pass `config.categories` from `App.tsx`**

In `App.tsx`, replace the existing prop:

```tsx
<CategoryDropdown
  anchor={dropdown.anchor}
  categories={config.categories}
  existingRule={dropdownExistingRule}
  onPick={handleDropdownPick}
  onRemove={handleDropdownRemove}
  onClose={() => setDropdown(null)}
/>
```

The remaining call sites that read `categoryMapping` for non-dropdown purposes (`parseTransactions`, `applyRules`) stay as-is because rules and merchant mappings remain 2-tuples.

- [ ] **Step 3: Run E2E (existing dropdown spec)**

Run: `make ci`
Expected: existing `category-rules.spec.ts` still passes — the visible primaries/subs come from the same names, just sourced differently.

- [ ] **Step 4: Commit**

```bash
git add v2/frontend/src/components/CategoryDropdown.tsx v2/frontend/src/App.tsx
git commit -m "feat: dropdown pulls primaries/subs from config.categories"
```

---

## Task 7: E2E test for edit mode

**Files:**
- Create: `v2/e2e/category-tree-edit.spec.ts`

- [ ] **Step 1: Write the spec**

Mirror the patterns from `category-rules.spec.ts`. Skip mobile project. Cover: open edit mode, rename a primary, add a child, delete a child.

```ts
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-bank-norwegian.xlsx');

async function loadFixture(page: Page) {
  await page.goto('/', { timeout: 60000 });
  await page.evaluate(() => {
    localStorage.removeItem('bts-savefile-v1');
    localStorage.removeItem('bts-rules-v1');
    localStorage.removeItem('theme');
  });
  await page.reload();
  await page.locator('#fileInput').setInputFiles(fixtureFile);
  await page.waitForSelector('.statistics-section table tbody tr');
}

test.describe('Category tree editing (prototype G)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'Mobile Chrome',
      'mobile edit-mode is a known degraded experience for prototype G'
    );
    // confirm() must auto-accept for the delete test
    // Page-level dialog handler is registered per-test below.
  });

  test('toggle reveals edit chrome and Esc exits', async ({ page }) => {
    await loadFixture(page);
    const toggle = page.locator('[data-testid="cat-edit-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.cat-edit-hint')).toBeVisible();
    await expect(page.locator('[data-testid="cat-add-primary"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cat-edit-hint')).toBeHidden();
  });

  test('rename a primary updates rules referencing it', async ({ page }) => {
    await loadFixture(page);
    // Create a rule pinned to "Reise"
    const firstCell = page.locator('[data-testid="cat-cell-0"]');
    await firstCell.scrollIntoViewIfNeeded();
    await firstCell.click({ force: true });
    await page.locator('[data-testid="cd-primary-Reise"]').click();
    await page.locator('.category-dropdown button.cd-item-sub').first().click();
    await page.locator('[data-testid="rd-create"]').click();

    // Enter edit mode and rename "Reise" → "Travel"
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const reiseRow = page.locator('tr[data-path]').filter({ hasText: 'Reise' }).first();
    await reiseRow.locator('.cat-name.editable').first().click();
    const input = page.locator('.cat-name-input');
    await input.fill('Travel');
    await input.press('Enter');

    // Toggle off and verify
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('.statistics-section table')).toContainText('Travel');
    await expect(page.locator('.statistics-section table')).not.toContainText('Reise');

    // Open the rules panel and confirm the category cell reads "Travel"
    await page.locator('[data-testid="rules-panel-toggle"]').click();
    await expect(page.locator('.rules-category').first()).toContainText('Travel');
  });

  test('add a child under a primary appears in the table and dropdown', async ({ page }) => {
    await loadFixture(page);
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const matRow = page.locator('tr[data-path]').filter({ hasText: 'Mat og drikke' }).first();
    const addBtn = matRow.locator('.icon-btn.add');
    await addBtn.click();
    const input = page.locator('.cat-name-input');
    await input.fill('Snacks');
    await input.press('Enter');

    // Toggle off; the new sub appears under Mat og drikke (with zero-amounts)
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    // Re-enter edit mode to verify the row persists
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('tr[data-path]').filter({ hasText: 'Snacks' })).toBeVisible();
  });

  test('delete a primary cascades and removes the rows', async ({ page }) => {
    await loadFixture(page);
    page.on('dialog', (d) => d.accept());
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const reiseRow = page.locator('tr[data-path]').filter({ hasText: 'Reise' }).first();
    await reiseRow.locator('.icon-btn.danger').click();
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('.statistics-section table')).not.toContainText('Reise');
  });

  test('add primary appends a new top-level row', async ({ page }) => {
    await loadFixture(page);
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await page.locator('[data-testid="cat-add-primary"]').click();
    const input = page.locator('.cat-name-input');
    await input.fill('Investments');
    await input.press('Enter');
    await expect(page.locator('tr[data-path]').filter({ hasText: 'Investments' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E**

Run: `make ci`
Expected: PASS — new spec green, existing specs unaffected.

If a flake surfaces (e.g. timing on `setTimeout(..., 0)` for rename focus), add `await page.waitForSelector('.cat-name-input')` between actions.

- [ ] **Step 3: Commit**

```bash
git add v2/e2e/category-tree-edit.spec.ts
git commit -m "test(e2e): cover category tree editing (prototype G)"
```

---

## Task 8: Design doc update + screenshots

**Files:**
- Modify: `docs/DESIGN-category-editing.md`
- Add (optional): `screenshots/proto-g-impl-*.png` for the PR description

- [ ] **Step 1: Append an "Implementation status" section to `DESIGN-category-editing.md`**

Append at the bottom (preserving the existing "Status" block):

```markdown
## Implementation status

- 2026-04-26 — prototype G shipped to the production app.
  `SaveFile.version` bumped 1→2 with a recursive `CategoryNode[]` shape;
  v1→v2 migration runs in place on first load. Edit-mode toggle lives in
  the statistics controls bar; click-to-rename, add child, delete subtree
  (with cascade through `merchantCodeMappings` and `textPatternRules`),
  drag-to-reorder among siblings, and emoji selection on top-level rows
  are all wired. `CategoryDropdown` now sources primaries and subs from
  `config.categories` so deletions and renames are reflected in the
  picker. E2E coverage in `v2/e2e/category-tree-edit.spec.ts`.

  Known limitations carried forward from the prototype's "weaknesses":
  - Mobile edit-mode is intentionally degraded — drag handles, hover-only
    "+/×" affordances, and narrow rows make tablet/phone editing
    impractical. The mobile E2E project skips this spec.
  - Renames/deletes that affect rules cascade silently; there's no preview
    of which rules will change. Acceptable for MVP given the user can
    reopen the rules panel afterwards to inspect.
```

- [ ] **Step 2: Capture screenshots for the PR**

Use the playwright skill to start the dev server, take three shots:
- View mode (toggle off) — shows current rendering
- Edit mode (toggle on) — shows hint banner, drag handles, +/× affordances
- Edit mode with a 3rd-level child added — demonstrates arbitrary depth

Save under `screenshots/` at the repo root (per project convention).

- [ ] **Step 3: Commit**

```bash
git add docs/DESIGN-category-editing.md screenshots/
git commit -m "docs: prototype G shipped (implementation status + screenshots)"
```

---

## Self-Review Notes

- **Spec coverage.** Toggle, rename, add child, delete subtree, drag-reorder, emoji picker, add primary, arbitrary depth, persistence via SaveFile, rule/mapping cascade, dropdown-source switch — all covered.
- **Placeholder scan.** No "TBD" / "TODO" left. Each rename / delete / drag step has explicit code.
- **Type consistency.** `CategoryNode`, `CategoryTree`, `Path`, `NamePath`, `AddChildResult`, `AddRootResult` are defined in Task 2 and reused thereafter. `getNodeAt`, `renameAt`, `addChildAt`, `addRoot`, `deleteAt`, `reorderSiblings`, `setEmojiAt`, `pathOfPrimaryByName`, `namePathOf`, `rewriteRulesForRename`, `rewriteMappingsForRename`, `collectAffectedRules`, `collectAffectedMappings`, `deleteFromMappings` — same names used in Tasks 3-7.
- **Risks.** (1) The auto-expand on edit-mode entry may be jarring on very tall trees; we surface this in the design doc as a known UX trade-off. (2) Cascade-rewriting rules silently is the chosen path per the design doc — if user feedback shows it's surprising, a confirm dialog can be added in a follow-up.
