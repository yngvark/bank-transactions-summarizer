import { RawTransaction } from '../../../../shared/types';
import { RawRow, BankAdapter } from './types';
import { bankNorwegianAdapter } from './bankNorwegianAdapter';
import { dnbAdapter } from './dnbAdapter';

const adapters: BankAdapter[] = [bankNorwegianAdapter, dnbAdapter];

export function normalizeTransactions(headers: string[], rows: RawRow[]): RawTransaction[] {
  for (const adapter of adapters) {
    if (adapter.matchesHeaders(headers)) {
      return adapter.normalize(rows);
    }
  }
  throw new Error(
    `Unsupported bank format. Found columns: ${headers.join(', ')}. ` +
    `Supported banks: ${adapters.map((a) => a.displayName).join(', ')}.`
  );
}
