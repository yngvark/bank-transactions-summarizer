import { describe, it, expect, vi } from 'vitest';
import {
  saveTransactions,
  loadTransactions,
  clearTransactions,
  TRANSACTIONS_STORAGE_KEY,
} from './transactionPersistence';
import type { RawTransaction } from '../../../shared/types';

function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  });
  return store;
}

function sampleTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    TransactionDate: new Date('2026-04-15'),
    BookDate: new Date('2026-04-16'),
    ValueDate: new Date('2026-04-16'),
    Text: 'KIWI 1234 OSLO',
    Type: 'Kjøp',
    'Currency Amount': -125.5,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -125.5,
    'Merchant Area': '',
    'Merchant Category': 'GROCERY',
    ...overrides,
  };
}

describe('transactionPersistence', () => {
  it('round-trips fileName, count and transaction fields', () => {
    stubLocalStorage();
    const txs = [sampleTransaction(), sampleTransaction({ Text: 'REMA 1000' })];
    saveTransactions('bank-2026-q1.xlsx', txs);

    const loaded = loadTransactions();
    expect(loaded).not.toBeNull();
    expect(loaded!.fileName).toBe('bank-2026-q1.xlsx');
    expect(loaded!.transactions).toHaveLength(2);
    expect(loaded!.transactions[0].Text).toBe('KIWI 1234 OSLO');
    expect(loaded!.transactions[0].Amount).toBe(-125.5);
    expect(loaded!.transactions[1].Text).toBe('REMA 1000');
  });

  it('returns null when nothing is stored', () => {
    stubLocalStorage();
    expect(loadTransactions()).toBeNull();
  });

  it('returns null and removes the key on corrupt JSON', () => {
    const store = stubLocalStorage();
    store.set(TRANSACTIONS_STORAGE_KEY, '{not-json');
    expect(loadTransactions()).toBeNull();
    expect(store.has(TRANSACTIONS_STORAGE_KEY)).toBe(false);
  });

  it('returns null and removes the key on version mismatch', () => {
    const store = stubLocalStorage();
    store.set(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify({ version: 999, fileName: 'x', savedAt: '', transactions: [] })
    );
    expect(loadTransactions()).toBeNull();
    expect(store.has(TRANSACTIONS_STORAGE_KEY)).toBe(false);
  });

  it('returns null and removes the key when payload is structurally wrong', () => {
    const store = stubLocalStorage();
    store.set(TRANSACTIONS_STORAGE_KEY, JSON.stringify({ totally: 'unrelated' }));
    expect(loadTransactions()).toBeNull();
    expect(store.has(TRANSACTIONS_STORAGE_KEY)).toBe(false);
  });

  it('clearTransactions removes the stored entry', () => {
    const store = stubLocalStorage();
    saveTransactions('a.xlsx', [sampleTransaction()]);
    expect(store.has(TRANSACTIONS_STORAGE_KEY)).toBe(true);
    clearTransactions();
    expect(store.has(TRANSACTIONS_STORAGE_KEY)).toBe(false);
  });

  it('stores Date fields as JSON-safe values that the parser can re-hydrate', () => {
    stubLocalStorage();
    saveTransactions('a.xlsx', [sampleTransaction()]);
    const loaded = loadTransactions()!;
    // After JSON round-trip Dates become ISO strings; that's fine because
    // RawTransaction date fields accept `Date | string | null` and parser.ts
    // converts via `new Date(v)`.
    const d = loaded.transactions[0].TransactionDate;
    expect(typeof d === 'string' || d instanceof Date).toBe(true);
    expect(new Date(d as string | Date).toISOString()).toBe(
      new Date('2026-04-15').toISOString()
    );
  });

  it('saveTransactions does not throw if localStorage.setItem rejects (quota)', () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    vi.stubGlobal('localStorage', failingStorage);
    expect(() => saveTransactions('a.xlsx', [sampleTransaction()])).not.toThrow();
  });
});
