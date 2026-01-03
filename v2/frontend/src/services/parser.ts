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
      TransactionDate:
        typeof row.TransactionDate === 'string'
          ? new Date(row.TransactionDate)
          : row.TransactionDate,
      BookDate:
        typeof row.BookDate === 'string' ? new Date(row.BookDate) : row.BookDate,
      ValueDate:
        typeof row.ValueDate === 'string' ? new Date(row.ValueDate) : row.ValueDate,
    }))
    .map((row) => ({
      ...row,
      Category: getCategoryFromMapping(categoryMapping, row['Merchant Category']),
    })) as Transaction[];
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
