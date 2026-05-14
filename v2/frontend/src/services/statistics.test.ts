import { describe, it, expect } from 'vitest';
import { calculateStatistics } from './statistics';
import { Transaction } from '../../../shared/types';

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    TransactionDate: new Date('2023-06-15'),
    BookDate: new Date('2023-06-15'),
    ValueDate: new Date('2023-06-15'),
    Text: 'Test',
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

describe('calculateStatistics', () => {
  it('excludes Reservert (undated) rows from yearMonths', () => {
    const txs: Transaction[] = [
      makeTx({ TransactionDate: new Date('2023-06-15'), Amount: -100 }),
      makeTx({
        TransactionDate: null,
        BookDate: null,
        ValueDate: null,
        Type: 'Reservert',
        Amount: -999,
      }),
    ];

    const stats = calculateStatistics(txs);
    expect(stats.yearMonths).toEqual(['2023-06']);
  });

  it('excludes Reservert amount from sums and footer', () => {
    const txs: Transaction[] = [
      makeTx({ TransactionDate: new Date('2023-06-15'), Amount: -100 }),
      makeTx({
        TransactionDate: null,
        BookDate: null,
        ValueDate: null,
        Type: 'Reservert',
        Amount: -9999,
      }),
    ];

    const stats = calculateStatistics(txs);
    const totals = stats.rawTableData.flatMap((r) => r.periodTotals);
    expect(totals).not.toContain(-9999);
    expect(totals).toContain(-100);

    const categorySum = stats.rawTableData.reduce((a, r) => a + r.sum, 0);
    expect(categorySum).toBe(-100);
  });

  it('preserves yearMonths and categories from structureTransactions even when narrower value set has no matches', () => {
    const structure: Transaction[] = [
      makeTx({
        TransactionDate: new Date('2023-06-15'),
        Category: 'Mat og drikke ➡ Dagligvarer',
        Amount: -100,
      }),
      makeTx({
        TransactionDate: new Date('2023-07-15'),
        Category: 'Personlig forbruk ➡ Klær og sko',
        Amount: -200,
      }),
    ];
    // Value set is a strict subset — only the June Dagligvarer row.
    const values: Transaction[] = [structure[0]];

    const stats = calculateStatistics(values, { structureTransactions: structure });

    // Columns: both months from the structure set, sorted.
    expect(stats.yearMonths).toEqual(['2023-06', '2023-07']);

    // Rows: both categories from the structure set, sorted.
    const categoriesShown = stats.rawTableData.map((r) => r.category);
    expect(categoriesShown).toEqual([
      'Mat og drikke ➡ Dagligvarer',
      'Personlig forbruk ➡ Klær og sko',
    ]);

    // Klær og sko has no values; its row is all zeros.
    const klar = stats.rawTableData.find((r) => r.category === 'Personlig forbruk ➡ Klær og sko');
    expect(klar?.periodTotals).toEqual([0, 0]);
    expect(klar?.sum).toBe(0);

    // Dagligvarer keeps June's value, July is zero.
    const mat = stats.rawTableData.find((r) => r.category === 'Mat og drikke ➡ Dagligvarer');
    expect(mat?.periodTotals).toEqual([-100, 0]);
  });

  it('handles all-Reservert input without crashing', () => {
    const txs: Transaction[] = [
      makeTx({
        TransactionDate: null,
        BookDate: null,
        ValueDate: null,
        Type: 'Reservert',
        Amount: -50,
      }),
      makeTx({
        TransactionDate: null,
        BookDate: null,
        ValueDate: null,
        Type: 'Reservert',
        Amount: -75,
      }),
    ];

    const stats = calculateStatistics(txs);
    expect(stats.yearMonths).toEqual([]);
    expect(stats.rawTableData).toEqual([]);
    expect(stats.categoryTree).toEqual([]);
  });
});
