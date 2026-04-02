import { describe, it, expect } from 'vitest';
import { parseTransactions } from './parser';
import { RawTransaction, CategoryMapping } from '../../../shared/types';
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import categoryMapping from '../data/categories.json';

function loadFixtureTransactions(): RawTransaction[] {
  const filePath = path.resolve(__dirname, '../../../e2e/fixtures/test-transactions.xlsx');
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawTransaction>(worksheet);
}

describe('parseTransactions', () => {
  describe('with XLSX fixture', () => {
    it('parses transactions from XLSX file', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(categoryMapping, raw);

      // The "From 123456798012" Innbetaling with positive amount is filtered out
      expect(result).toHaveLength(4);
    });

    it('assigns correct categories from XLSX data', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(categoryMapping, raw);

      const categories = result.map((t) => t.Category);
      expect(categories).toContain('Personlig forbruk ➡ PC og elektroutstyr'); // Electronic Sales
      expect(categories).toContain('Mat og drikke ➡ Dagligvarer'); // Grocery Stores
      expect(categories).toContain('Mat og drikke ➡ Restauranter og barer'); // Eating places
    });

    it('converts string dates to Date objects', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(categoryMapping, raw);

      for (const t of result) {
        expect(t.TransactionDate).toBeInstanceOf(Date);
        expect(t.BookDate).toBeInstanceOf(Date);
        expect(t.ValueDate).toBeInstanceOf(Date);
      }
    });
  });

  describe('with inline data', () => {
    const mapping: CategoryMapping = {
      'Electronic Sales': ['Personlig forbruk', 'PC og elektroutstyr'],
      'Grocery Stores, Supermarkets': ['Mat og drikke', 'Dagligvarer'],
    };

    it('trims whitespace from Text and Merchant Category', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: '2023-01-01',
          BookDate: '2023-01-01',
          ValueDate: '2023-01-01',
          Text: '  KOMPLETT.NO  ',
          Type: 'Kjøp',
          'Currency Amount': -100,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -100,
          'Merchant Area': 'OSLO',
          'Merchant Category': '  Electronic Sales  ',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result[0].Text).toBe('KOMPLETT.NO');
      expect(result[0].Category).toBe('Personlig forbruk ➡ PC og elektroutstyr');
    });

    it('assigns "Ukjent kategori" for unknown merchant categories', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: '2023-01-01',
          BookDate: '2023-01-01',
          ValueDate: '2023-01-01',
          Text: 'Some store',
          Type: 'Kjøp',
          'Currency Amount': -50,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -50,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Unknown Category XYZ',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result[0].Category).toBe('Ukjent kategori');
    });

    it('filters out own invoice payments (positive amount matching "From <digits>")', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: '2023-01-01',
          BookDate: '2023-01-01',
          ValueDate: '2023-01-01',
          Text: 'From 123456798012',
          Type: 'Innbetaling',
          'Currency Amount': 25000,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: 25000,
          'Merchant Area': '',
          'Merchant Category': '',
        },
        {
          TransactionDate: '2023-01-01',
          BookDate: '2023-01-01',
          ValueDate: '2023-01-01',
          Text: 'Normal purchase',
          Type: 'Kjøp',
          'Currency Amount': -100,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -100,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result).toHaveLength(1);
      expect(result[0].Text).toBe('Normal purchase');
    });

    it('handles empty Merchant Category gracefully', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: '2023-01-01',
          BookDate: '2023-01-01',
          ValueDate: '2023-01-01',
          Text: 'Some transaction',
          Type: 'Kjøp',
          'Currency Amount': -50,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -50,
          'Merchant Area': 'OSLO',
          'Merchant Category': '',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result[0].Category).toBe('Ukjent kategori');
    });

    it('converts string dates to Date objects', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: '2023-06-15',
          BookDate: '2023-06-16',
          ValueDate: '2023-06-17',
          Text: 'Test',
          Type: 'Kjøp',
          'Currency Amount': -10,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -10,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result[0].TransactionDate).toBeInstanceOf(Date);
      expect(result[0].TransactionDate.getFullYear()).toBe(2023);
      expect(result[0].TransactionDate.getMonth()).toBe(5); // June = 5
      expect(result[0].TransactionDate.getDate()).toBe(15);
    });

    it('preserves Date objects that are already Date instances', () => {
      const date = new Date('2023-06-15');
      const raw: RawTransaction[] = [
        {
          TransactionDate: date,
          BookDate: date,
          ValueDate: date,
          Text: 'Test',
          Type: 'Kjøp',
          'Currency Amount': -10,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -10,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(mapping, raw);
      expect(result[0].TransactionDate).toBeInstanceOf(Date);
    });
  });
});
