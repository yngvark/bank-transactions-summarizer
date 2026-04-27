import { describe, it, expect } from 'vitest';
import { validateSaveFile } from './savefile';
import type { SaveFile } from '../../../shared/types';

function validSaveFile(): SaveFile {
  return {
    version: 2,
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
    rules: {
      merchantCodeMappings: {
        'Grocery Stores, Supermarkets': ['Mat og drikke', 'Dagligvarer'],
        'Airlines': ['Reise', 'Flyselskap'],
      },
      textPatternRules: [
        {
          id: 'rule-1',
          type: 'substring',
          pattern: 'SPOTIFY',
          category: ['Personlig forbruk', 'Digitale tjenester'],
        },
      ],
    },
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
      expect(result.data.version).toBe(2);
      expect(result.data.rules.textPatternRules).toHaveLength(1);
    }
  });

  it('accepts a minimal SaveFile with empty rules and categories', () => {
    const result = validateSaveFile({
      version: 2,
      categories: [],
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects wrong version', () => {
    const sf = validSaveFile() as unknown as Record<string, unknown>;
    sf.version = 1;
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

  it('rejects invalid rule type', () => {
    const sf = validSaveFile();
    (sf.rules.textPatternRules[0] as { type: string }).type = 'glob';
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('rules.textPatternRules.0.type');
  });

  it('rejects rule category that is not a 2-tuple', () => {
    const sf = validSaveFile();
    (sf.rules.textPatternRules[0] as { category: unknown }).category = ['only-one'];
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
  });

  it('rejects merchant mapping that is not a 2-tuple', () => {
    const sf = validSaveFile();
    (sf.rules.merchantCodeMappings as Record<string, unknown>)['Foo'] = ['only-one'];
    const result = validateSaveFile(sf);
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
      version: 2,
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
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
      settings: { theme: 'light', density: 'normal' },
    });
    expect(result.ok).toBe(true);
  });
});
