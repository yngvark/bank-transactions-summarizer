import { describe, it, expect } from 'vitest';
import {
  getNodeAt,
  countDescendants,
  renameAt,
  addChildAt,
  deleteAt,
  reorderSiblings,
  pathOfPrimaryByName,
  collectAffectedRules,
  rewriteRulesForRename,
  renameCategoryCascade,
} from './categoryEdit';
import type { CategoryTree, SaveFile, Rule } from '../../../shared/types';

const baseTree = (): CategoryTree => [
  { name: 'Mat og drikke', children: [
    { name: 'Dagligvarer', children: [{ name: 'Rema 1000', children: [] }] },
    { name: 'Restaurant', children: [] },
  ]},
  { name: 'Reise', children: [
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

describe('pathOfPrimaryByName', () => {
  it('finds a top-level node by name', () => {
    expect(pathOfPrimaryByName(baseTree(), 'Reise')).toEqual([1]);
  });
  it('returns null when not found', () => {
    expect(pathOfPrimaryByName(baseTree(), 'Nope')).toBeNull();
  });
});

describe('rewriteRulesForRename', () => {
  const rules: Rule[] = [
    { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
    { id: '2', field: 'text', match: 'substring', pattern: 'B', category: ['Reise', 'Tog'] },
    { id: '3', field: 'text', match: 'substring', pattern: 'C', category: ['Mat og drikke', 'Restaurant'] },
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

  it('rewrites both text and merchantCategory rules', () => {
    const mixed: Rule[] = [
      { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
      { id: '2', field: 'merchantCategory', match: 'exact', pattern: 'Grocery Stores', category: ['Mat og drikke', 'Dagligvarer'] },
      { id: '3', field: 'text', match: 'substring', pattern: 'B', category: ['Reise', 'Tog'] },
    ];
    const next = rewriteRulesForRename(mixed, ['Mat og drikke'], 'Food');
    expect(next.find((r) => r.id === '1')!.category).toEqual(['Food', 'Dagligvarer']);
    expect(next.find((r) => r.id === '2')!.category).toEqual(['Food', 'Dagligvarer']);
    expect(next.find((r) => r.id === '3')!.category).toEqual(['Reise', 'Tog']);
  });
});

describe('renameCategoryCascade', () => {
  const baseSaveFile = (): SaveFile => ({
    version: 3,
    categories: [
      { name: 'Mat og drikke', children: [
        { name: 'Dagligvarer', children: [] },
        { name: 'Restaurant', children: [] },
      ]},
      { name: 'Reise', children: [
        { name: 'Tog', children: [] },
      ]},
    ],
    rules: [
      { id: 'seed-5411', field: 'merchantCategory', match: 'exact', pattern: '5411', category: ['Mat og drikke', 'Dagligvarer'] },
      { id: 'seed-4111', field: 'merchantCategory', match: 'exact', pattern: '4111', category: ['Reise', 'Tog'] },
      { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
      { id: '2', field: 'text', match: 'substring', pattern: 'B', category: ['Reise', 'Tog'] },
    ],
    settings: { theme: 'light', density: 'normal' },
  });

  it('renames a primary in categories and rules in one call', () => {
    const next = renameCategoryCascade(baseSaveFile(), [0], 'Mat');
    expect(next.categories[0].name).toBe('Mat');
    const seeded = next.rules.find((r) => r.id === 'seed-5411');
    expect(seeded?.category).toEqual(['Mat', 'Dagligvarer']);
    const textRule = next.rules.find((r) => r.id === '1');
    expect(textRule?.category).toEqual(['Mat', 'Dagligvarer']);
    // Unaffected rule
    expect(next.rules.find((r) => r.id === '2')?.category).toEqual(['Reise', 'Tog']);
  });

  it('renames a sub-category leaving the primary alone', () => {
    const next = renameCategoryCascade(baseSaveFile(), [0, 0], 'Mat-D');
    expect(next.categories[0].children[0].name).toBe('Mat-D');
    expect(next.rules.find((r) => r.id === 'seed-5411')?.category).toEqual(['Mat og drikke', 'Mat-D']);
    expect(next.rules.find((r) => r.id === '1')?.category).toEqual(['Mat og drikke', 'Mat-D']);
  });

  it('preserves settings and version unchanged', () => {
    const before = baseSaveFile();
    const next = renameCategoryCascade(before, [0], 'Mat');
    expect(next.version).toBe(before.version);
    expect(next.settings).toEqual(before.settings);
  });

  it('does not mutate the input SaveFile', () => {
    const before = baseSaveFile();
    const snapshot = JSON.parse(JSON.stringify(before));
    renameCategoryCascade(before, [0], 'Mat');
    expect(before).toEqual(snapshot);
  });

  it('throws when a sibling already has the new name (and does not mutate input)', () => {
    const before = baseSaveFile();
    expect(() => renameCategoryCascade(before, [0], 'Reise')).toThrow(/sibling/i);
    expect(before.categories[0].name).toBe('Mat og drikke');
  });

  it('is a no-op when the new name equals the existing name', () => {
    const before = baseSaveFile();
    const next = renameCategoryCascade(before, [0], 'Mat og drikke');
    expect(next.categories[0].name).toBe('Mat og drikke');
    expect(next.rules.find((r) => r.id === 'seed-5411')?.category).toEqual(['Mat og drikke', 'Dagligvarer']);
  });
});

describe('collectAffectedRules', () => {
  const rules: Rule[] = [
    { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Mat og drikke', 'Dagligvarer'] },
    { id: '2', field: 'merchantCategory', match: 'exact', pattern: 'X', category: ['Reise', 'Tog'] },
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
