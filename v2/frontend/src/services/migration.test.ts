import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  runMigration,
  deriveCategoryTree,
  SAVEFILE_STORAGE_KEY,
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
  it('groups subcategories under primary categories', () => {
    const tree = deriveCategoryTree({
      A: ['Food', 'Groceries'],
      B: ['Food', 'Restaurants'],
      C: ['Travel', 'Flights'],
    });
    expect(tree['Food'].subcategories).toEqual(['Groceries', 'Restaurants']);
    expect(tree['Travel'].subcategories).toEqual(['Flights']);
  });

  it('deduplicates subcategories', () => {
    const tree = deriveCategoryTree({
      A: ['Food', 'Groceries'],
      B: ['Food', 'Groceries'],
    });
    expect(tree['Food'].subcategories).toEqual(['Groceries']);
  });

  it('returns empty object for empty mappings', () => {
    expect(deriveCategoryTree({})).toEqual({});
  });
});

describe('runMigration', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('builds fresh SaveFile on first run with no legacy keys', () => {
    const sf = runMigration();
    expect(sf.version).toBe(1);
    expect(sf.rules.textPatternRules).toEqual([]);
    expect(sf.settings.theme).toBe('light');
    expect(sf.settings.density).toBe('normal');
    expect(Object.keys(sf.rules.merchantCodeMappings).length).toBeGreaterThan(0);
    expect(Object.keys(sf.categories).length).toBeGreaterThan(0);
  });

  it('persists the SaveFile to localStorage', () => {
    runMigration();
    const raw = store.get(SAVEFILE_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
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
    store.set(SAVEFILE_STORAGE_KEY, '{not-json');
    const sf = runMigration();
    expect(sf.version).toBe(1);
    expect(JSON.parse(store.get(SAVEFILE_STORAGE_KEY)!).version).toBe(1);
  });

  it('rebuilds when stored SaveFile fails schema validation', () => {
    store.set(SAVEFILE_STORAGE_KEY, JSON.stringify({ version: 99 }));
    const sf = runMigration();
    expect(sf.version).toBe(1);
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
});
