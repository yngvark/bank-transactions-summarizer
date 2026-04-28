import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToLocalStorage, fingerprint, importFromFile } from './persistence';
import { SAVEFILE_STORAGE_KEY } from './boot';
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
    version: 2,
    categories: [
      { name: 'Food', children: [{ name: 'Groceries', children: [] }] },
    ],
    rules: {
      merchantCodeMappings: { 'GROCERY': ['Food', 'Groceries'] },
      textPatternRules: [],
    },
    settings: { theme: 'light', density: 'normal' },
  };
}

describe('saveToLocalStorage', () => {
  it('writes the SaveFile JSON under the canonical key', () => {
    const store = stubLocalStorage();
    const sf = validSaveFile();
    saveToLocalStorage(sf);
    const raw = store.get(SAVEFILE_STORAGE_KEY);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!)).toEqual(sf);
  });
});

describe('fingerprint', () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it('changes when content changes', () => {
    const a = validSaveFile();
    const b = validSaveFile();
    b.settings.theme = 'dark';
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('is stable for equal content', () => {
    expect(fingerprint(validSaveFile())).toBe(fingerprint(validSaveFile()));
  });

  it('is stable across object key reordering', () => {
    const a: SaveFile = {
      version: 2,
      categories: [
        { name: 'Food', children: [{ name: 'Groceries', children: [] }] },
      ],
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    };
    // Same SaveFile, settings keys defined in opposite order.
    const b: SaveFile = {
      version: 2,
      rules: { textPatternRules: [], merchantCodeMappings: {} },
      settings: { density: 'normal', theme: 'light' },
      categories: [
        { name: 'Food', children: [{ name: 'Groceries', children: [] }] },
      ],
    };
    expect(fingerprint(a)).toBe(fingerprint(b));
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

  it('rejects unknown extra keys (strict schema)', async () => {
    const sf = validSaveFile() as SaveFile & { extra?: string };
    sf.extra = 'should not be allowed';
    const file = new File([JSON.stringify(sf)], 'cfg.json');
    await expect(importFromFile(file)).rejects.toThrow(/Invalid save file/);
  });
});
