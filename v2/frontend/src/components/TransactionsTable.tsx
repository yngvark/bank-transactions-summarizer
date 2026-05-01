import { useMemo, useState } from 'react';
import { Transaction } from '../../../shared/types';

interface TransactionsTableProps {
  transactions: Transaction[];
  onCategoryClick: (txIndex: number, anchor: DOMRect) => void;
}

type SortKey = keyof Transaction;
type SortDir = 'asc' | 'desc' | null;

const tableHeaders = ['Date', 'Text', 'Type', 'Amount', 'Merchant Category', 'Category'];
const dataKeys: SortKey[] = [
  'TransactionDate',
  'Text',
  'Type',
  'Amount',
  'Merchant Category',
  'Category',
];

const numberFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'decimal',
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const UNKNOWN_CATEGORY = 'Ukjent kategori';

function compare(a: Transaction, b: Transaction, key: SortKey): number {
  if (key === 'TransactionDate' || key === 'BookDate' || key === 'ValueDate') {
    const av = a[key] as Date | null;
    const bv = b[key] as Date | null;
    // Pending rows (null date) always sink to bottom regardless of direction.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return av.getTime() - bv.getTime();
  }
  if (typeof a[key] === 'number' && typeof b[key] === 'number') {
    return (a[key] as number) - (b[key] as number);
  }
  return String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'nb');
}

function TransactionsTable({ transactions, onCategoryClick }: TransactionsTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'Category',
    dir: null,
  });

  const displayIndices = useMemo(() => {
    const indices = transactions.map((_, i) => i);
    if (!sort.dir) return indices;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return indices.sort((a, b) => {
      // For date columns we want nulls last regardless of sort direction.
      if (sort.key === 'TransactionDate' || sort.key === 'BookDate' || sort.key === 'ValueDate') {
        const av = transactions[a][sort.key] as Date | null;
        const bv = transactions[b][sort.key] as Date | null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
      }
      return sign * compare(transactions[a], transactions[b], sort.key);
    });
  }, [transactions, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((curr) => {
      if (curr.key !== key) return { key, dir: 'asc' };
      const next: SortDir = curr.dir === null ? 'asc' : curr.dir === 'asc' ? 'desc' : null;
      return { key, dir: next };
    });
  };

  const formatValue = (key: SortKey, value: unknown): string => {
    if (key === 'TransactionDate' && value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (key === 'Amount' && typeof value === 'number') {
      return numberFormatter.format(value);
    }
    return String(value ?? '');
  };

  const renderCategoryCell = (tx: Transaction, txIndex: number) => {
    const isUnknown = tx.Category === UNKNOWN_CATEGORY;
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      onCategoryClick(txIndex, rect);
    };
    return (
      <td
        key="Category"
        className={`cat-cell-td ${isUnknown ? 'cat-cell-td-unknown' : ''}`}
      >
        <button
          type="button"
          className={`cat-cell ${isUnknown ? 'cat-uncat' : ''}`}
          onClick={handleClick}
          data-testid={`cat-cell-${txIndex}`}
          title="Click to categorize"
        >
          {isUnknown ? `⚠ ${tx.Category}` : tx.Category}
        </button>
      </td>
    );
  };

  const iconFor = (key: SortKey): string => {
    if (sort.key !== key || sort.dir === null) return '⇕';
    return sort.dir === 'asc' ? '▲' : '▼';
  };

  const extraTestId = (key: SortKey): string | undefined =>
    key === 'Category' ? 'category-sort-header' : undefined;

  return (
    <table id="transactions-table">
      <thead>
        <tr>
          {tableHeaders.map((header, i) => {
            const key = dataKeys[i];
            const active = sort.key === key && sort.dir;
            const className = `sortable ${active ? `sort-${sort.dir}` : ''}`;
            return (
              <th
                key={header}
                className={className}
                onClick={() => toggleSort(key)}
                data-testid={extraTestId(key) ?? `sort-header-${key}`}
              >
                {header} <span className="sort-icon">{iconFor(key)}</span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {displayIndices.map((txIndex) => {
          const transaction = transactions[txIndex];
          return (
            <tr key={txIndex}>
              {dataKeys.map((key) =>
                key === 'Category'
                  ? renderCategoryCell(transaction, txIndex)
                  : (
                    <td key={key}>{formatValue(key, transaction[key])}</td>
                  )
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default TransactionsTable;
