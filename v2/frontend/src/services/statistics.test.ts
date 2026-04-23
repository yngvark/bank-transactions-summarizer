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
