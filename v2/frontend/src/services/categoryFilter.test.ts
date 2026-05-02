import { describe, it, expect } from 'vitest';
import { transactionMatchesCategoryFilter } from './categoryFilter';

describe('transactionMatchesCategoryFilter', () => {
  it('matches when the category equals the selected path', () => {
    expect(
      transactionMatchesCategoryFilter('Mat og drikke ➡ Restaurant', 'Mat og drikke ➡ Restaurant'),
    ).toBe(true);
  });

  it('matches a descendant when filtering by a primary', () => {
    expect(
      transactionMatchesCategoryFilter('Mat og drikke ➡ Restaurant', 'Mat og drikke'),
    ).toBe(true);
  });

  it('matches a deeper descendant', () => {
    expect(
      transactionMatchesCategoryFilter('Mat og drikke ➡ Restaurant ➡ Pizza', 'Mat og drikke'),
    ).toBe(true);
  });

  it('does not match a sibling primary', () => {
    expect(
      transactionMatchesCategoryFilter('Transport ➡ Bensin', 'Mat og drikke'),
    ).toBe(false);
  });

  it('does not match a sibling sub-category', () => {
    expect(
      transactionMatchesCategoryFilter('Mat og drikke ➡ Dagligvarer', 'Mat og drikke ➡ Restaurant'),
    ).toBe(false);
  });

  it('does not match on a partial-segment prefix', () => {
    // "Mat" is a prefix of "Mat og drikke" as a string but not as a segment —
    // the separator requirement prevents accidental matches.
    expect(
      transactionMatchesCategoryFilter('Mat og drikke ➡ Restaurant', 'Mat'),
    ).toBe(false);
  });

  it('does not match an unknown category against a real path', () => {
    expect(
      transactionMatchesCategoryFilter('Ukjent kategori', 'Mat og drikke'),
    ).toBe(false);
  });

  it('returns true when the selected path is empty (no filter)', () => {
    expect(transactionMatchesCategoryFilter('Mat og drikke ➡ Restaurant', '')).toBe(true);
  });
});
