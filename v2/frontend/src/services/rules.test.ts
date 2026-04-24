import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  matchesPattern,
  applyRules,
  findRuleForTransaction,
  getMatchingTransactions,
  isValidRegex,
  loadRules,
  saveRules,
  RULES_STORAGE_KEY,
} from './rules';
import { Transaction, TextPatternRule } from '../../../shared/types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    TransactionDate: new Date('2023-01-01'),
    BookDate: new Date('2023-01-01'),
    ValueDate: new Date('2023-01-01'),
    Text: 'DEFAULT TEXT',
    Type: 'Kjøp',
    'Currency Amount': -100,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -100,
    'Merchant Area': 'OSLO',
    'Merchant Category': 'Electronic Sales',
    Category: 'Personlig forbruk ➡ PC og elektroutstyr',
    ...overrides,
  };
}

function makeRule(overrides: Partial<TextPatternRule> = {}): TextPatternRule {
  return {
    id: 'rule-1',
    type: 'substring',
    pattern: 'SPOTIFY',
    category: ['Personlig forbruk', 'Digitale tjenester'],
    ...overrides,
  };
}

describe('matchesPattern', () => {
  it('matches substring case-insensitively', () => {
    const rule = makeRule({ type: 'substring', pattern: 'spotify' });
    expect(matchesPattern('SPOTIFY PREMIUM', rule)).toBe(true);
    expect(matchesPattern('Spotify subscription', rule)).toBe(true);
  });

  it('does not match substring when absent', () => {
    const rule = makeRule({ type: 'substring', pattern: 'netflix' });
    expect(matchesPattern('SPOTIFY PREMIUM', rule)).toBe(false);
  });

  it('matches regex case-insensitively', () => {
    const rule = makeRule({ type: 'regex', pattern: 'kiwi|meny' });
    expect(matchesPattern('KIWI STORO', rule)).toBe(true);
    expect(matchesPattern('meny lønner', rule)).toBe(true);
    expect(matchesPattern('REMA 1000', rule)).toBe(false);
  });

  it('returns false for invalid regex', () => {
    const rule = makeRule({ type: 'regex', pattern: '[' });
    expect(matchesPattern('anything', rule)).toBe(false);
  });

  it('returns false when text is empty', () => {
    const rule = makeRule({ type: 'substring', pattern: 'foo' });
    expect(matchesPattern('', rule)).toBe(false);
  });
});

describe('applyRules', () => {
  it('returns transactions unchanged when rules array is empty', () => {
    const txs = [makeTx({ Text: 'SPOTIFY' })];
    const result = applyRules(txs, []);
    expect(result[0].Category).toBe('Personlig forbruk ➡ PC og elektroutstyr');
  });

  it('replaces Category with rule category (joined with ➡) when rule matches', () => {
    const txs = [makeTx({ Text: 'SPOTIFY PREMIUM', Category: 'Ukjent kategori' })];
    const rule = makeRule({
      type: 'substring',
      pattern: 'SPOTIFY',
      category: ['Personlig forbruk', 'Digitale tjenester'],
    });
    const result = applyRules(txs, [rule]);
    expect(result[0].Category).toBe('Personlig forbruk ➡ Digitale tjenester');
  });

  it('preserves merchant-code Category when no rule matches', () => {
    const txs = [makeTx({ Text: 'REMA 1000', Category: 'Mat og drikke ➡ Dagligvarer' })];
    const rule = makeRule({ type: 'substring', pattern: 'SPOTIFY' });
    const result = applyRules(txs, [rule]);
    expect(result[0].Category).toBe('Mat og drikke ➡ Dagligvarer');
  });

  it('applies first-match-wins when multiple rules match same transaction', () => {
    const txs = [makeTx({ Text: 'MENY STORO' })];
    const narrowRule = makeRule({
      id: 'r1',
      type: 'substring',
      pattern: 'MENY STORO',
      category: ['Mat og drikke', 'Dagligvarer'],
    });
    const broadRule = makeRule({
      id: 'r2',
      type: 'regex',
      pattern: 'kiwi|meny',
      category: ['Kontanter og pengeoverføring', 'Kontaktuttak'],
    });

    const resultNarrowFirst = applyRules(txs, [narrowRule, broadRule]);
    expect(resultNarrowFirst[0].Category).toBe('Mat og drikke ➡ Dagligvarer');

    const resultBroadFirst = applyRules(txs, [broadRule, narrowRule]);
    expect(resultBroadFirst[0].Category).toBe('Kontanter og pengeoverføring ➡ Kontaktuttak');
  });

  it('does not mutate the input transactions array', () => {
    const original = makeTx({ Text: 'SPOTIFY', Category: 'Ukjent kategori' });
    const txs = [original];
    const rule = makeRule({
      pattern: 'SPOTIFY',
      category: ['Personlig forbruk', 'Digitale tjenester'],
    });
    applyRules(txs, [rule]);
    expect(original.Category).toBe('Ukjent kategori');
  });
});

describe('findRuleForTransaction', () => {
  it('returns the first matching rule', () => {
    const tx = makeTx({ Text: 'MENY STORO' });
    const r1 = makeRule({ id: 'r1', pattern: 'MENY STORO' });
    const r2 = makeRule({ id: 'r2', type: 'regex', pattern: 'meny' });
    expect(findRuleForTransaction(tx, [r1, r2])?.id).toBe('r1');
  });

  it('returns undefined when no rule matches', () => {
    const tx = makeTx({ Text: 'REMA' });
    const r1 = makeRule({ pattern: 'SPOTIFY' });
    expect(findRuleForTransaction(tx, [r1])).toBeUndefined();
  });

  it('returns undefined when rules array is empty', () => {
    expect(findRuleForTransaction(makeTx(), [])).toBeUndefined();
  });
});

describe('getMatchingTransactions', () => {
  const txs = [
    makeTx({ Text: 'SPOTIFY PREMIUM' }),
    makeTx({ Text: 'SPOTIFY NO AS' }),
    makeTx({ Text: 'NETFLIX' }),
    makeTx({ Text: 'REMA 1000' }),
  ];

  it('returns substring matches case-insensitively', () => {
    const result = getMatchingTransactions(txs, 'spotify', 'substring');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.Text)).toEqual(['SPOTIFY PREMIUM', 'SPOTIFY NO AS']);
  });

  it('returns regex matches', () => {
    const result = getMatchingTransactions(txs, 'rema|netflix', 'regex');
    expect(result).toHaveLength(2);
  });

  it('returns empty array for invalid regex', () => {
    const result = getMatchingTransactions(txs, '[', 'regex');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty pattern', () => {
    expect(getMatchingTransactions(txs, '', 'substring')).toEqual([]);
    expect(getMatchingTransactions(txs, '', 'regex')).toEqual([]);
  });
});

describe('isValidRegex', () => {
  it('returns true for valid patterns', () => {
    expect(isValidRegex('foo')).toBe(true);
    expect(isValidRegex('foo|bar')).toBe(true);
    expect(isValidRegex('^REMA.*')).toBe(true);
  });

  it('returns false for invalid patterns', () => {
    expect(isValidRegex('[')).toBe(false);
    expect(isValidRegex('(abc')).toBe(false);
    expect(isValidRegex('*')).toBe(false);
  });

  it('returns false for empty pattern', () => {
    expect(isValidRegex('')).toBe(false);
  });
});

describe('loadRules / saveRules (localStorage)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    });
  });

  it('returns empty array when storage key is not set', () => {
    expect(loadRules()).toEqual([]);
  });

  it('returns empty array when stored value is invalid JSON', () => {
    localStorage.setItem(RULES_STORAGE_KEY, 'not-json{');
    expect(loadRules()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem(RULES_STORAGE_KEY, '{"not": "an array"}');
    expect(loadRules()).toEqual([]);
  });

  it('round-trips rules through save + load', () => {
    const rules: TextPatternRule[] = [
      makeRule({ id: 'a', pattern: 'SPOTIFY' }),
      makeRule({ id: 'b', type: 'regex', pattern: 'kiwi|meny' }),
    ];
    saveRules(rules);
    expect(loadRules()).toEqual(rules);
  });

  it('overwrites previous rules on save', () => {
    saveRules([makeRule({ id: 'a' })]);
    saveRules([makeRule({ id: 'b' })]);
    const result = loadRules();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});
