import { RawTransaction } from '../../../../shared/types';
import { BankAdapter, RawRow } from './types';

const REQUIRED_HEADERS = ['TransactionDate', 'Amount', 'Text', 'Merchant Category'];

export const bankNorwegianAdapter: BankAdapter = {
  id: 'bank-norwegian',
  displayName: 'Bank Norwegian',

  matchesHeaders(headers: string[]): boolean {
    return REQUIRED_HEADERS.every((h) => headers.includes(h));
  },

  normalize(rows: RawRow[]): RawTransaction[] {
    return rows as unknown as RawTransaction[];
  },
};
