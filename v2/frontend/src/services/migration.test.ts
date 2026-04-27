import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  runMigration,
  deriveCategoryTree,
  SAVEFILE_STORAGE_KEY,
  SAVEFILE_BACKUP_KEY,
  LEGACY_RULES_KEY,
  LEGACY_THEME_KEY,
} from './migration';
import type { SaveFile, TextPatternRule } from '../../../shared/types';

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

describe('runMigration', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('builds fresh SaveFile on first run with no legacy keys', () => {
    const sf = runMigration();
    expect(sf.version).toBe(2);
    expect(sf.rules.textPatternRules).toEqual([]);
    expect(sf.settings.theme).toBe('light');
    expect(sf.settings.density).toBe('normal');
    expect(Object.keys(sf.rules.merchantCodeMappings).length).toBeGreaterThan(0);
    expect(sf.categories.length).toBeGreaterThan(0);
  });

  it('persists the SaveFile to localStorage', () => {
    runMigration();
    const raw = store.get(SAVEFILE_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
  });

  it('carries over legacy rules', () => {
    const legacyRules: TextPatternRule[] = [
      {
        id: 'r1',
        type: 'substring',
        pattern: 'SPOTIFY',
        category: ['Personlig forbruk', 'Digitale tjenester'],
      },
    ];
    store.set(LEGACY_RULES_KEY, JSON.stringify(legacyRules));
    const sf = runMigration();
    expect(sf.rules.textPatternRules).toEqual(legacyRules);
  });

  it('carries over legacy theme', () => {
    store.set(LEGACY_THEME_KEY, 'dark');
    const sf = runMigration();
    expect(sf.settings.theme).toBe('dark');
  });

  it('removes legacy keys after successful migration', () => {
    store.set(LEGACY_RULES_KEY, '[]');
    store.set(LEGACY_THEME_KEY, 'dark');
    runMigration();
    expect(store.has(LEGACY_RULES_KEY)).toBe(false);
    expect(store.has(LEGACY_THEME_KEY)).toBe(false);
  });

  it('is idempotent: re-uses an existing valid SaveFile', () => {
    const first = runMigration();
    first.rules.textPatternRules.push({
      id: 'manual',
      type: 'substring',
      pattern: 'foo',
      category: ['X', 'Y'],
    });
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(first));

    const second = runMigration();
    expect(second.rules.textPatternRules).toHaveLength(1);
    expect(second.rules.textPatternRules[0].id).toBe('manual');
  });

  it('rebuilds when stored SaveFile is corrupt JSON', () => {
    const corrupt = '{not-json';
    store.set(SAVEFILE_STORAGE_KEY, corrupt);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sf = runMigration();
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
    const sf = runMigration();
    expect(sf.version).toBe(2);
    expect(store.get(SAVEFILE_BACKUP_KEY)).toBe(invalid);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ignores legacy rules when stored value is not an array', () => {
    store.set(LEGACY_RULES_KEY, '{"not":"array"}');
    const sf: SaveFile = runMigration();
    expect(sf.rules.textPatternRules).toEqual([]);
  });

  it('treats unknown theme value as light', () => {
    store.set(LEGACY_THEME_KEY, 'sepia');
    const sf = runMigration();
    expect(sf.settings.theme).toBe('light');
  });

  it('produces a SaveFile that passes its own schema', async () => {
    const { validateSaveFile } = await import('../schemas/savefile');
    const sf = runMigration();
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(true);
  });

  it('upgrades a v1 SaveFile to v2 in place, merging emoji into the category name', () => {
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
    const mat = sf.categories.find((n) => n.name === '🍔 Mat og drikke');
    expect(mat).toBeDefined();
    expect(mat?.children.map((c) => c.name)).toEqual(['Dagligvarer', 'Restauranter']);
    expect(sf.rules.merchantCodeMappings['5411']).toEqual(['Mat og drikke', 'Dagligvarer']);
    expect(sf.settings.theme).toBe('light');
    expect(sf.settings.density).toBe('normal');
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!).version).toBe(2);
  });

  it('strips legacy emoji field from a v2 SaveFile and merges it into the name', () => {
    const oldV2 = {
      version: 2,
      categories: [
        {
          name: 'Mat og drikke',
          emoji: '🍔',
          children: [{ name: 'Dagligvarer', children: [] }],
        },
        { name: 'Reise', emoji: '✈️', children: [] },
      ],
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    };
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify(oldV2));
    const sf = runMigration();
    expect(sf.categories.map((n) => n.name)).toEqual(['🍔 Mat og drikke', '✈️ Reise']);
    expect(sf.categories[0].children[0].name).toBe('Dagligvarer');
    // Persisted form no longer carries the emoji field.
    const persisted = JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!);
    expect(persisted.categories[0].emoji).toBeUndefined();
    expect(persisted.categories[0].name).toBe('🍔 Mat og drikke');
  });
});
