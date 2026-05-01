import type { RawTransaction } from '../../../shared/types';

// Slot for the most recently uploaded transactions plus the source filename.
// Independent of `bts-savefile-v1` (config) — transactions are private and
// deliberately kept out of the exportable JSON.
export const TRANSACTIONS_STORAGE_KEY = 'bts-transactions-v1';

const PAYLOAD_VERSION = 1;

interface StoredPayload {
  version: 1;
  fileName: string;
  savedAt: string;
  transactions: RawTransaction[];
}

export interface LoadedTransactions {
  fileName: string;
  transactions: RawTransaction[];
}

export function saveTransactions(fileName: string, transactions: RawTransaction[]): void {
  const payload: StoredPayload = {
    version: PAYLOAD_VERSION,
    fileName,
    savedAt: new Date().toISOString(),
    transactions,
  };
  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn(
      `[bts] Could not persist transactions (${(err as Error).message}). ` +
        `In-memory state is unaffected; the data will be lost on refresh.`
    );
  }
}

export function loadTransactions(): LoadedTransactions | null {
  const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
  if (raw == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    return null;
  }

  if (!isStoredPayload(parsed)) {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    return null;
  }

  return { fileName: parsed.fileName, transactions: parsed.transactions };
}

export function clearTransactions(): void {
  localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
}

function isStoredPayload(value: unknown): value is StoredPayload {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === PAYLOAD_VERSION &&
    typeof v.fileName === 'string' &&
    typeof v.savedAt === 'string' &&
    Array.isArray(v.transactions)
  );
}
