import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadOrInitSaveFile,
  deriveCategoryTree,
  SAVEFILE_STORAGE_KEY,
  SAVEFILE_BACKUP_KEY,
} from './boot';
import type { Rule } from '../../../shared/types';
import categoriesJson from '../data/categories.json';

function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  });
  return store;
}

// Re-export importSeededRules for testing by calling buildFreshSaveFile indirectly
// via loadOrInitSaveFile, or directly test its effects through the public API.

describe('deriveCategoryTree', () => {
  it('groups sub-nodes under primary nodes from Rule[]', () => {
    const rules: Rule[] = [
      { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Food', 'Groceries'] },
      { id: '2', field: 'text', match: 'substring', pattern: 'B', category: ['Food', 'Restaurants'] },
      { id: '3', field: 'merchantCategory', match: 'exact', pattern: 'X', category: ['Travel', 'Flights'] },
    ];
    const tree = deriveCategoryTree(rules);
    const food = tree.find((n) => n.name === 'Food');
    const travel = tree.find((n) => n.name === 'Travel');
    expect(food?.children.map((c) => c.name)).toEqual(['Groceries', 'Restaurants']);
    expect(travel?.children.map((c) => c.name)).toEqual(['Flights']);
    expect(food?.children.every((c) => c.children.length === 0)).toBe(true);
  });

  it('deduplicates sub-nodes', () => {
    const rules: Rule[] = [
      { id: '1', field: 'text', match: 'substring', pattern: 'A', category: ['Food', 'Groceries'] },
      { id: '2', field: 'text', match: 'substring', pattern: 'B', category: ['Food', 'Groceries'] },
    ];
    const tree = deriveCategoryTree(rules);
    const food = tree.find((n) => n.name === 'Food')!;
    expect(food.children.map((c) => c.name)).toEqual(['Groceries']);
  });

  it('returns empty array for empty rules', () => {
    expect(deriveCategoryTree([])).toEqual([]);
  });
});

describe('importSeededRules (via buildFreshSaveFile)', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('produces rules with count matching categories.json', () => {
    const sf = loadOrInitSaveFile();
    const expected = Object.keys(categoriesJson).length;
    expect(sf.rules.length).toBe(expected);
  });

  it('all seeded rules have field=merchantCategory and match=exact', () => {
    const sf = loadOrInitSaveFile();
    for (const rule of sf.rules) {
      expect(rule.field).toBe('merchantCategory');
      expect(rule.match).toBe('exact');
    }
  });

  it('all seeded rule ids are unique', () => {
    const sf = loadOrInitSaveFile();
    const ids = sf.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all seeded rule ids start with "seed-"', () => {
    const sf = loadOrInitSaveFile();
    for (const rule of sf.rules) {
      expect(rule.id).toMatch(/^seed-/);
    }
  });
});

describe('loadOrInitSaveFile', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('builds fresh SaveFile on first run', () => {
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(3);
    expect(Array.isArray(sf.rules)).toBe(true);
    expect(sf.rules.length).toBeGreaterThan(0);
    expect(sf.settings.theme).toBe('light');
    expect(sf.settings.density).toBe('normal');
    expect(sf.categories.length).toBeGreaterThan(0);
  });

  it('persists the SaveFile to localStorage', () => {
    loadOrInitSaveFile();
    const raw = store.get(SAVEFILE_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(3);
  });

  it('is idempotent: re-uses an existing valid SaveFile', () => {
    const first = loadOrInitSaveFile();
    const extra: Rule = {
      id: 'manual',
      field: 'text',
      match: 'substring',
      pattern: 'foo',
      category: ['X', 'Y'],
    };
    first.rules.push(extra);
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(first));

    const second = loadOrInitSaveFile();
    expect(second.rules.some((r) => r.id === 'manual')).toBe(true);
  });

  it('rebuilds when stored SaveFile is corrupt JSON', () => {
    const corrupt = '{not-json';
    store.set(SAVEFILE_STORAGE_KEY, corrupt);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(3);
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!).version).toBe(3);
    // Original blob preserved at backup key, with a warning logged.
    expect(store.get(SAVEFILE_BACKUP_KEY)).toBe(corrupt);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rebuilds when stored SaveFile fails schema validation', () => {
    const invalid = JSON.stringify({ version: 99 });
    store.set(SAVEFILE_STORAGE_KEY, invalid);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(3);
    expect(store.get(SAVEFILE_BACKUP_KEY)).toBe(invalid);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rebuilds when stored SaveFile is old v2 format', () => {
    const v2 = JSON.stringify({
      version: 2,
      categories: [],
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    });
    store.set(SAVEFILE_STORAGE_KEY, v2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(3);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('produces a SaveFile that passes its own schema', async () => {
    const { validateSaveFile } = await import('../schemas/savefile');
    const sf = loadOrInitSaveFile();
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(true);
  });

  it('heals drift where rules reference primaries missing from categories', () => {
    const drifted = {
      version: 3,
      categories: [
        { name: 'Hus og innbo', children: [{ name: 'Interiør og varehus', children: [] }] },
      ],
      rules: [
        { id: 'seed-dept', field: 'merchantCategory', match: 'exact', pattern: 'Department Stores', category: ['Hus og innbo2', 'Interiør og varehus'] },
        { id: 'seed-var', field: 'merchantCategory', match: 'exact', pattern: 'Variety Stores', category: ['Hus og innbo2', 'Interiør og varehus'] },
      ],
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(drifted));
    const sf = loadOrInitSaveFile();
    const names = sf.categories.map((n) => n.name);
    expect(names).toContain('Hus og innbo2');
    const renamed = sf.categories.find((n) => n.name === 'Hus og innbo2');
    expect(renamed?.children.map((c) => c.name)).toContain('Interiør og varehus');
    // Healed state must be re-persisted so subsequent loads are stable.
    const persisted = JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!);
    expect(persisted.categories.some((n: { name: string }) => n.name === 'Hus og innbo2')).toBe(true);
  });

  it('heals drift where a sub-category in rules is missing from the tree', () => {
    const drifted = {
      version: 3,
      categories: [{ name: 'Mat og drikke', children: [{ name: 'Dagligvarer', children: [] }] }],
      rules: [
        { id: 'r1', field: 'merchantCategory', match: 'exact', pattern: '5411', category: ['Mat og drikke', 'Dagligvarer'] },
        { id: 'r2', field: 'merchantCategory', match: 'exact', pattern: '5812', category: ['Mat og drikke', 'Restauranter'] },
      ],
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(drifted));
    const sf = loadOrInitSaveFile();
    const mat = sf.categories.find((n) => n.name === 'Mat og drikke');
    expect(mat?.children.map((c) => c.name).sort()).toEqual(['Dagligvarer', 'Restauranter']);
  });

  it('leaves a consistent SaveFile untouched (heal step is a no-op when nothing drifts)', () => {
    const consistent = {
      version: 3,
      categories: [{ name: 'Mat og drikke', children: [{ name: 'Dagligvarer', children: [] }] }],
      rules: [
        { id: 'r1', field: 'merchantCategory', match: 'exact', pattern: '5411', category: ['Mat og drikke', 'Dagligvarer'] },
      ],
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(consistent));
    const sf = loadOrInitSaveFile();
    expect(sf).toEqual(consistent);
    // No spurious re-write either — the value in storage stays identical.
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!)).toEqual(consistent);
  });
});
