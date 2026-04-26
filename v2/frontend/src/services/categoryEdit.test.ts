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
