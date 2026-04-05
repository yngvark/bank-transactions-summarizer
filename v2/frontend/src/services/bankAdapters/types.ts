import { RawTransaction } from '../../../../shared/types';

export type RawRow = Record<string, unknown>;

export type BankFormatId = 'bank-norwegian' | 'dnb';

export interface BankAdapter {
  id: BankFormatId;
  displayName: string;
  matchesHeaders(headers: string[]): boolean;
  normalize(rows: RawRow[]): RawTransaction[];
}
