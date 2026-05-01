import { describe, it, expect } from 'vitest';
import {
  applyRules,
  findRuleForTransaction,
  getMatchingTransactions,
  isValidRegex,
  matchesRule,
} from './rules';
import { Transaction, Rule } from '../../../shared/types';

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

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    field: 'text',
    match: 'substring',
    pattern: 'SPOTIFY',
    category: ['Personlig forbruk', 'Digitale tjenester'],
    ...overrides,
  };
}

describe('applyRules', () => {
  it('returns transactions unchanged when rules array is empty', () => {
    const txs = [makeTx({ Text: 'SPOTIFY' })];
    const result = applyRules(txs, []);
    expect(result[0].Category).toBe('Personlig forbruk ➡ PC og elektroutstyr');
  });

  it('replaces Category with rule category (joined with ➡) when rule matches', () => {
    const txs = [makeTx({ Text: 'SPOTIFY PREMIUM', Category: 'Ukjent kategori' })];
    const rule = makeRule({
      match: 'substring',
      pattern: 'SPOTIFY',
      category: ['Personlig forbruk', 'Digitale tjenester'],
    });
    const result = applyRules(txs, [rule]);
    expect(result[0].Category).toBe('Personlig forbruk ➡ Digitale tjenester');
  });

  it('preserves merchant-code Category when no rule matches', () => {
    const txs = [makeTx({ Text: 'REMA 1000', Category: 'Mat og drikke ➡ Dagligvarer' })];
    const rule = makeRule({ match: 'substring', pattern: 'SPOTIFY' });
    const result = applyRules(txs, [rule]);
    expect(result[0].Category).toBe('Mat og drikke ➡ Dagligvarer');
  });

  it('applies first-match-wins when multiple rules match same transaction', () => {
    const txs = [makeTx({ Text: 'MENY STORO' })];
    const narrowRule = makeRule({
      id: 'r1',
      match: 'substring',
      pattern: 'MENY STORO',
      category: ['Mat og drikke', 'Dagligvarer'],
    });
    const broadRule = makeRule({
      id: 'r2',
      match: 'regex',
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

  it('applies merchantCategory exact rules', () => {
    const txs = [makeTx({ 'Merchant Category': 'Electronic Sales', Category: 'Ukjent kategori' })];
    const rule = makeRule({
      field: 'merchantCategory',
      match: 'exact',
      pattern: 'Electronic Sales',
      category: ['Personlig forbruk', 'PC og elektroutstyr'],
    });
    const result = applyRules(txs, [rule]);
    expect(result[0].Category).toBe('Personlig forbruk ➡ PC og elektroutstyr');
  });
});

describe('findRuleForTransaction', () => {
  it('returns the first matching rule', () => {
    const tx = makeTx({ Text: 'MENY STORO' });
    const r1 = makeRule({ id: 'r1', pattern: 'MENY STORO' });
    const r2 = makeRule({ id: 'r2', match: 'regex', pattern: 'meny' });
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

  it('finds merchantCategory rules', () => {
    const tx = makeTx({ 'Merchant Category': 'Electronic Sales' });
    const r = makeRule({ field: 'merchantCategory', match: 'exact', pattern: 'Electronic Sales' });
    expect(findRuleForTransaction(tx, [r])?.id).toBe('rule-1');
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
    const result = getMatchingTransactions(txs, 'spotify', 'substring', 'text');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.Text)).toEqual(['SPOTIFY PREMIUM', 'SPOTIFY NO AS']);
  });

  it('returns regex matches', () => {
    const result = getMatchingTransactions(txs, 'rema|netflix', 'regex', 'text');
    expect(result).toHaveLength(2);
  });

  it('returns empty array for invalid regex', () => {
    const result = getMatchingTransactions(txs, '[', 'regex', 'text');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty pattern', () => {
    expect(getMatchingTransactions(txs, '', 'substring', 'text')).toEqual([]);
    expect(getMatchingTransactions(txs, '', 'regex', 'text')).toEqual([]);
  });

  it('defaults to text field when field is omitted', () => {
    const result = getMatchingTransactions(txs, 'spotify', 'substring');
    expect(result).toHaveLength(2);
  });

  it('matches on merchantCategory field', () => {
    const mcTxs = [
      makeTx({ 'Merchant Category': 'Electronic Sales' }),
      makeTx({ 'Merchant Category': 'Grocery Stores, Supermarkets' }),
    ];
    const result = getMatchingTransactions(mcTxs, 'Electronic Sales', 'exact', 'merchantCategory');
    expect(result).toHaveLength(1);
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

describe('matchesRule', () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    TransactionDate: null,
    BookDate: null,
    ValueDate: null,
    Text: '',
    Type: '',
    'Currency Amount': 0,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: 0,
    'Merchant Area': '',
    'Merchant Category': '',
    Category: '',
    ...over,
  });

  const rule = (over: Partial<Rule>): Rule => ({
    id: 'r1',
    field: 'text',
    match: 'substring',
    pattern: '',
    category: ['A', 'B'],
    ...over,
  });

  it('matches substring on text field (case-insensitive)', () => {
    expect(matchesRule(tx({ Text: 'Rema 1000 Oslo' }), rule({ pattern: 'rema' }))).toBe(true);
  });

  it('matches regex on text field (case-insensitive)', () => {
    expect(matchesRule(tx({ Text: 'AB12' }), rule({ match: 'regex', pattern: '^ab\\d+$' }))).toBe(true);
  });

  it('matches exact on merchantCategory field (case-sensitive)', () => {
    const r = rule({ field: 'merchantCategory', match: 'exact', pattern: 'Grocery Stores, Supermarkets' });
    expect(matchesRule(tx({ 'Merchant Category': 'Grocery Stores, Supermarkets' }), r)).toBe(true);
    expect(matchesRule(tx({ 'Merchant Category': 'grocery stores, supermarkets' }), r)).toBe(false);
  });

  it('does not match when target field is empty', () => {
    expect(matchesRule(tx({}), rule({ pattern: 'foo' }))).toBe(false);
  });

  it('returns false on invalid regex', () => {
    expect(matchesRule(tx({ Text: 'x' }), rule({ match: 'regex', pattern: '[' }))).toBe(false);
  });
});
