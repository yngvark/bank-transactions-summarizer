import { useMemo, useState } from 'react';
import { Transaction } from '../../../shared/types';

interface TransactionsTableProps {
  transactions: Transaction[];
  onCategoryClick: (txIndex: number, anchor: DOMRect) => void;
}

type SortDir = 'asc' | 'desc' | null;

const tableHeaders = ['Date', 'Text', 'Type', 'Amount', 'Merchant Category', 'Category'];
const dataKeys: (keyof Transaction)[] = [
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

function TransactionsTable({ transactions, onCategoryClick }: TransactionsTableProps) {
  const [categorySort, setCategorySort] = useState<SortDir>(null);

  const displayIndices = useMemo(() => {
    const indices = transactions.map((_, i) => i);
    if (!categorySort) return indices;
    return indices.sort((a, b) => {
      const cmp = transactions[a].Category.localeCompare(transactions[b].Category, 'nb');
      return categorySort === 'asc' ? cmp : -cmp;
    });
  }, [transactions, categorySort]);

  const toggleCategorySort = () => {
    setCategorySort((curr) => (curr === null ? 'asc' : curr === 'asc' ? 'desc' : null));
  };

  const formatValue = (key: keyof Transaction, value: unknown): string => {
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

  const sortIcon = categorySort === 'asc' ? '▲' : categorySort === 'desc' ? '▼' : '⇕';

  return (
    <table id="transactions-table">
      <thead>
        <tr>
          {tableHeaders.map((header) =>
            header === 'Category' ? (
              <th
                key={header}
                className={`sortable ${categorySort ? `sort-${categorySort}` : ''}`}
                onClick={toggleCategorySort}
                data-testid="category-sort-header"
              >
                {header} <span className="sort-icon">{sortIcon}</span>
              </th>
            ) : (
              <th key={header}>{header}</th>
            )
          )}
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
