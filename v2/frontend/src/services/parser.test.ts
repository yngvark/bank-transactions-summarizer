import { describe, it, expect } from 'vitest';
import { parseTransactions } from './parser';
import { RawTransaction } from '../../../shared/types';
import ExcelJS from '@protobi/exceljs';
import * as fs from 'fs';
import * as path from 'path';

async function loadFixtureTransactions(): Promise<RawTransaction[]> {
  const filePath = path.resolve(__dirname, '../../../e2e/fixtures/test-transactions-bank-norwegian.xlsx');
  const buffer = fs.readFileSync(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const worksheet = workbook.worksheets[0];

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value);
  });

  const results: RawTransaction[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber]) {
        obj[headers[colNumber]] = cell.value;
      }
    });
    results.push(obj as unknown as RawTransaction);
  });
  return results;
}

describe('parseTransactions', () => {
  describe('with XLSX fixture', () => {
    it('parses transactions from XLSX file', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(raw);

      // 4 settled + 1 Reservert (pending) rows; the "From …" invoice row is filtered out
      expect(result).toHaveLength(5);
    });

    it('assigns "Ukjent kategori" for all transactions after parsing (rules applied separately)', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(raw);

      // Parser no longer resolves categories — applyRules does that in App
      for (const t of result) {
        expect(t.Category).toBe('Ukjent kategori');
      }
    });

    it('converts string dates to Date objects for settled rows', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(raw);

      const settled = result.filter((t) => t.Type !== 'Reservert');
      expect(settled.length).toBeGreaterThan(0);
      for (const t of settled) {
        expect(t.TransactionDate).toBeInstanceOf(Date);
        expect(t.BookDate).toBeInstanceOf(Date);
        expect(t.ValueDate).toBeInstanceOf(Date);
      }
    });

    it('keeps Reservert rows from XLSX with null dates', async () => {
      const raw = await loadFixtureTransactions();
      const result = parseTransactions(raw);

      const pending = result.filter((t) => t.Type === 'Reservert');
      expect(pending.length).toBeGreaterThan(0);
      for (const t of pending) {
        expect(t.TransactionDate).toBeNull();
        expect(t.BookDate).toBeNull();
        expect(t.ValueDate).toBeNull();
      }
    });
  });

  describe('with inline data', () => {
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

      const result = parseTransactions(raw);
      expect(result[0].Text).toBe('KOMPLETT.NO');
      expect(result[0]['Merchant Category']).toBe('Electronic Sales');
      // Category is not resolved by parser — rules do that
      expect(result[0].Category).toBe('Ukjent kategori');
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

      const result = parseTransactions(raw);
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

      const result = parseTransactions(raw);
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

      const result = parseTransactions(raw);
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

      const result = parseTransactions(raw);
      expect(result[0].TransactionDate).toBeInstanceOf(Date);
      expect(result[0].TransactionDate.getFullYear()).toBe(2023);
      expect(result[0].TransactionDate.getMonth()).toBe(5); // June = 5
      expect(result[0].TransactionDate.getDate()).toBe(15);
    });

    it('keeps Reservert rows with null date fields', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: null,
          BookDate: null,
          ValueDate: null,
          Text: 'Pending at ZARA',
          Type: 'Reservert',
          'Currency Amount': -299,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -299,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(raw);
      expect(result).toHaveLength(1);
      expect(result[0].TransactionDate).toBeNull();
      expect(result[0].BookDate).toBeNull();
      expect(result[0].ValueDate).toBeNull();
      expect(result[0].Type).toBe('Reservert');
      // Category comes from rules, not parser
      expect(result[0].Category).toBe('Ukjent kategori');
    });

    it('handles Reservert mixed with normal rows', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: null,
          BookDate: null,
          ValueDate: null,
          Text: 'Pending at ZARA',
          Type: 'Reservert',
          'Currency Amount': -299,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -299,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
        {
          TransactionDate: '2023-03-15',
          BookDate: '2023-03-15',
          ValueDate: '2023-03-15',
          Text: 'KOMPLETT.NO',
          Type: 'Kjøp',
          'Currency Amount': -499,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -499,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(raw);
      expect(result).toHaveLength(2);
      const pending = result.find((r) => r.Type === 'Reservert');
      const normal = result.find((r) => r.Type === 'Kjøp');
      expect(pending?.TransactionDate).toBeNull();
      expect(normal?.TransactionDate).toBeInstanceOf(Date);
    });

    it('treats undefined dates the same as null', () => {
      const raw: RawTransaction[] = [
        {
          TransactionDate: undefined as unknown as null,
          BookDate: undefined as unknown as null,
          ValueDate: undefined as unknown as null,
          Text: 'Pending',
          Type: 'Reservert',
          'Currency Amount': -10,
          'Currency Rate': 1,
          Currency: 'NOK',
          Amount: -10,
          'Merchant Area': 'OSLO',
          'Merchant Category': 'Electronic Sales',
        },
      ];

      const result = parseTransactions(raw);
      expect(result[0].TransactionDate).toBeNull();
      expect(result[0].BookDate).toBeNull();
      expect(result[0].ValueDate).toBeNull();
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

      const result = parseTransactions(raw);
      expect(result[0].TransactionDate).toBeInstanceOf(Date);
    });
  });
});
