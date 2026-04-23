import { RawTransaction, Transaction, CategoryMapping } from '../../../shared/types';

export function parseTransactions(
  categoryMapping: CategoryMapping,
  data: RawTransaction[]
): Transaction[] {
  return data
    .filter(removeMyOwnInvoicePayments)
    .map((row) => ({
      ...row,
      Text: row.Text.trim(),
      'Merchant Category': row['Merchant Category'] ? row['Merchant Category'].trim() : '',
      TransactionDate: toDateOrNull(row.TransactionDate),
      BookDate: toDateOrNull(row.BookDate),
      ValueDate: toDateOrNull(row.ValueDate),
    }))
    .map((row) => ({
      ...row,
      Category: getCategoryFromMapping(categoryMapping, row['Merchant Category']),
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

function getCategoryFromMapping(categoryMapping: CategoryMapping, key: string): string {
  if (!Object.prototype.hasOwnProperty.call(categoryMapping, key)) {
    return 'Ukjent kategori';
  }

  return categoryMapping[key].join(' ➡ ');
}
