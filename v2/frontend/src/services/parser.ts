import { RawTransaction, Transaction } from '../../../shared/types';

export function parseTransactions(data: RawTransaction[]): Transaction[] {
  return data
    .filter(removeMyOwnInvoicePayments)
    .map((row) => ({
      ...row,
      Text: row.Text.trim(),
      'Merchant Category': row['Merchant Category'] ? row['Merchant Category'].trim() : '',
      TransactionDate: toDateOrNull(row.TransactionDate),
      BookDate: toDateOrNull(row.BookDate),
      ValueDate: toDateOrNull(row.ValueDate),
      Category: 'Ukjent kategori',
    })) as Transaction[];
}

function toDateOrNull(v: Date | string | null | undefined): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  return new Date(v);
}

function removeMyOwnInvoicePayments(row: RawTransaction): boolean {
  const rowIsMyOwnInvoicePayment =
    row.Amount > 0 && /^From \d+$/.test(row.Text.trim());

  return !rowIsMyOwnInvoicePayment;
}
