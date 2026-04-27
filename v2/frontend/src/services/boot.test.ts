import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadOrInitSaveFile,
  deriveCategoryTree,
  SAVEFILE_STORAGE_KEY,
  SAVEFILE_BACKUP_KEY,
} from './boot';

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

describe('loadOrInitSaveFile', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('builds fresh SaveFile on first run', () => {
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(2);
    expect(sf.rules.textPatternRules).toEqual([]);
    expect(sf.settings.theme).toBe('light');
    expect(sf.settings.density).toBe('normal');
    expect(Object.keys(sf.rules.merchantCodeMappings).length).toBeGreaterThan(0);
    expect(sf.categories.length).toBeGreaterThan(0);
  });

  it('persists the SaveFile to localStorage', () => {
    loadOrInitSaveFile();
    const raw = store.get(SAVEFILE_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
  });

  it('is idempotent: re-uses an existing valid SaveFile', () => {
    const first = loadOrInitSaveFile();
    first.rules.textPatternRules.push({
      id: 'manual',
      type: 'substring',
      pattern: 'foo',
      category: ['X', 'Y'],
    });
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(first));

    const second = loadOrInitSaveFile();
    expect(second.rules.textPatternRules).toHaveLength(1);
    expect(second.rules.textPatternRules[0].id).toBe('manual');
  });

  it('rebuilds when stored SaveFile is corrupt JSON', () => {
    const corrupt = '{not-json';
    store.set(SAVEFILE_STORAGE_KEY, corrupt);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sf = loadOrInitSaveFile();
    expect(sf.version).toBe(2);
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!).version).toBe(2);
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
    expect(sf.version).toBe(2);
    expect(store.get(SAVEFILE_BACKUP_KEY)).toBe(invalid);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('produces a SaveFile that passes its own schema', async () => {
    const { validateSaveFile } = await import('../schemas/savefile');
    const sf = loadOrInitSaveFile();
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(true);
  });

  it('heals drift where merchantCodeMappings reference primaries missing from categories', () => {
    // Reproduces the user-reported state from feature/prototype-g testing:
    // a primary in mappings ("Hus og innbo2") had been renamed but the
    // categories tree still carried the original name ("Hus og innbo").
    const drifted = {
      version: 2,
      categories: [
        { name: 'Hus og innbo', children: [{ name: 'Interiør og varehus', children: [] }] },
      ],
      rules: {
        merchantCodeMappings: {
          'Department Stores': ['Hus og innbo2', 'Interiør og varehus'],
          'Variety Stores': ['Hus og innbo2', 'Interiør og varehus'],
        },
        textPatternRules: [],
      },
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

  it('heals drift where a sub-category in mappings is missing from the tree', () => {
    const drifted = {
      version: 2,
      categories: [{ name: 'Mat og drikke', children: [{ name: 'Dagligvarer', children: [] }] }],
      rules: {
        merchantCodeMappings: {
          '5411': ['Mat og drikke', 'Dagligvarer'],
          '5812': ['Mat og drikke', 'Restauranter'],
        },
        textPatternRules: [],
      },
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(drifted));
    const sf = loadOrInitSaveFile();
    const mat = sf.categories.find((n) => n.name === 'Mat og drikke');
    expect(mat?.children.map((c) => c.name).sort()).toEqual(['Dagligvarer', 'Restauranter']);
  });

  it('leaves a consistent SaveFile untouched (heal step is a no-op when nothing drifts)', () => {
    const consistent = {
      version: 2,
      categories: [{ name: 'Mat og drikke', children: [{ name: 'Dagligvarer', children: [] }] }],
      rules: {
        merchantCodeMappings: { '5411': ['Mat og drikke', 'Dagligvarer'] },
        textPatternRules: [],
      },
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(consistent));
    const sf = loadOrInitSaveFile();
    expect(sf).toEqual(consistent);
    // No spurious re-write either — the value in storage stays identical.
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!)).toEqual(consistent);
  });
});
