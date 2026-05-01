import { describe, it, expect } from 'vitest';
import { validateSaveFile } from './savefile';
import type { SaveFile } from '../../../shared/types';

function validSaveFile(): SaveFile {
  return {
    version: 3,
    categories: [
      {
        name: '\u{1F354} Mat og drikke',
        children: [
          { name: 'Dagligvarer', children: [] },
          { name: 'Restauranter og barer', children: [] },
        ],
      },
      {
        name: 'Reise',
        children: [
          { name: 'Flyselskap', children: [] },
          { name: 'Hotel og opphold', children: [] },
        ],
      },
    ],
    rules: [
      {
        id: 'seed-grocery',
        field: 'merchantCategory',
        match: 'exact',
        pattern: 'Grocery Stores, Supermarkets',
        category: ['Mat og drikke', 'Dagligvarer'],
      },
      {
        id: 'rule-1',
        field: 'text',
        match: 'substring',
        pattern: 'SPOTIFY',
        category: ['Personlig forbruk', 'Digitale tjenester'],
      },
    ],
    settings: {
      theme: 'dark',
      density: 'normal',
    },
  };
}

describe('validateSaveFile', () => {
  it('accepts a valid SaveFile', () => {
    const result = validateSaveFile(validSaveFile());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe(3);
      expect(result.data.rules).toHaveLength(2);
    }
  });

  it('accepts a minimal SaveFile with empty rules and categories', () => {
    const result = validateSaveFile({
      version: 3,
      categories: [],
      rules: [],
      settings: { theme: 'light', density: 'normal' },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects wrong version', () => {
    const sf = validSaveFile() as unknown as Record<string, unknown>;
    sf.version = 2;
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('version');
  });

  it('rejects missing version', () => {
    const sf = validSaveFile() as unknown as Record<string, unknown>;
    delete sf.version;
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('version');
  });

  it('rejects invalid theme value', () => {
    const sf = validSaveFile();
    (sf.settings as { theme: string }).theme = 'sepia';
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('settings.theme');
  });

  it('rejects invalid rule match value', () => {
    const sf = validSaveFile() as unknown as { rules: Array<Record<string, unknown>> };
    sf.rules[1].match = 'glob';
    const result = validateSaveFile(sf as unknown);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('rules.1.match');
  });

  it('rejects invalid rule field value', () => {
    const sf = validSaveFile() as unknown as { rules: Array<Record<string, unknown>> };
    sf.rules[0].field = 'description';
    const result = validateSaveFile(sf as unknown);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('rules.0.field');
  });

  it('rejects rule category that is not a 2-tuple', () => {
    const sf = validSaveFile() as unknown as { rules: Array<Record<string, unknown>> };
    sf.rules[0].category = ['only-one'];
    const result = validateSaveFile(sf as unknown);
    expect(result.ok).toBe(false);
  });

  it('rejects old v2 nested rules shape', () => {
    const result = validateSaveFile({
      version: 3,
      categories: [],
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects null and primitives', () => {
    expect(validateSaveFile(null).ok).toBe(false);
    expect(validateSaveFile('string').ok).toBe(false);
    expect(validateSaveFile(42).ok).toBe(false);
  });

  it('rejects category nodes whose children are not arrays', () => {
    const sf = validSaveFile() as unknown as { categories: Array<{ children: unknown }> };
    sf.categories[0].children = 'not-an-array';
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
  });

  it('rejects category nodes with non-string names', () => {
    const sf = validSaveFile() as unknown as { categories: Array<{ name: unknown }> };
    sf.categories[0].name = 123;
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
  });

  it('accepts deeply nested category nodes', () => {
    const result = validateSaveFile({
      version: 3,
      categories: [
        {
          name: 'A',
          children: [
            {
              name: 'B',
              children: [
                { name: 'C', children: [{ name: 'D', children: [] }] },
              ],
            },
          ],
        },
      ],
      rules: [],
      settings: { theme: 'light', density: 'normal' },
    });
    expect(result.ok).toBe(true);
  });
});
