import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  fingerprint,
  importFromFile,
} from './persistence';
import { SAVEFILE_STORAGE_KEY } from './migration';
import type { SaveFile } from '../../../shared/types';

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

function validSaveFile(): SaveFile {
  return {
    version: 1,
    categories: { Food: { subcategories: ['Groceries'] } },
    rules: {
      merchantCodeMappings: { 'GROCERY': ['Food', 'Groceries'] },
      textPatternRules: [],
    },
    settings: { theme: 'light', density: 'normal' },
  };
}

describe('localStorage round-trip', () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it('returns null when key is absent', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('round-trips a valid SaveFile', () => {
    const sf = validSaveFile();
    saveToLocalStorage(sf);
    const loaded = loadFromLocalStorage();
    expect(loaded).toEqual(sf);
  });

  it('returns null when stored value is not valid JSON', () => {
    localStorage.setItem(SAVEFILE_STORAGE_KEY, '{not-json');
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null when stored value fails schema validation', () => {
    localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadFromLocalStorage()).toBeNull();
  });
});

describe('fingerprint', () => {
  it('changes when content changes', () => {
    const a = validSaveFile();
    const b = validSaveFile();
    b.settings.theme = 'dark';
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('is stable for equal content', () => {
    expect(fingerprint(validSaveFile())).toBe(fingerprint(validSaveFile()));
  });
});

describe('importFromFile', () => {
  it('parses and validates a valid save file', async () => {
    const sf = validSaveFile();
    const file = new File([JSON.stringify(sf)], 'cfg.json', { type: 'application/json' });
    const result = await importFromFile(file);
    expect(result).toEqual(sf);
  });

  it('rejects invalid JSON with descriptive error', async () => {
    const file = new File(['{not-json'], 'cfg.json');
    await expect(importFromFile(file)).rejects.toThrow(/Invalid JSON/);
  });

  it('rejects schema-invalid content with descriptive error', async () => {
    const file = new File([JSON.stringify({ version: 2 })], 'cfg.json');
    await expect(importFromFile(file)).rejects.toThrow(/Invalid save file/);
  });
});
