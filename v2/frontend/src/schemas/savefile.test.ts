import { describe, it, expect } from 'vitest';
import { validateSaveFile } from './savefile';
import type { SaveFile } from '../../../shared/types';

function validSaveFile(): SaveFile {
  return {
    version: 1,
    categories: {
      'Mat og drikke': {
        emoji: '\u{1F354}',
        subcategories: ['Dagligvarer', 'Restauranter og barer'],
      },
      'Reise': {
        subcategories: ['Flyselskap', 'Hotel og opphold'],
      },
    },
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
      expect(result.data.version).toBe(1);
      expect(result.data.rules.textPatternRules).toHaveLength(1);
    }
  });

  it('accepts a minimal SaveFile with empty rules and categories', () => {
    const result = validateSaveFile({
      version: 1,
      categories: {},
      rules: { merchantCodeMappings: {}, textPatternRules: [] },
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

  it('rejects subcategories that are not strings', () => {
    const sf = validSaveFile() as unknown as Record<string, unknown>;
    (sf.categories as Record<string, { subcategories: unknown[] }>)['Mat og drikke'].subcategories = [
      123,
    ];
    const result = validateSaveFile(sf);
    expect(result.ok).toBe(false);
  });
});
