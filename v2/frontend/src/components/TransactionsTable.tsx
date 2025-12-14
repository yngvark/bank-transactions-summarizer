import { Transaction } from '../../../shared/types';

interface TransactionsTableProps {
  transactions: Transaction[];
}

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

function TransactionsTable({ transactions }: TransactionsTableProps) {
  const formatValue = (key: keyof Transaction, value: unknown): string => {
    if (key === 'TransactionDate' && value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (key === 'Amount' && typeof value === 'number') {
      return numberFormatter.format(value);
    }
    return String(value ?? '');
  };

  return (
    <table id="transactions-table">
      <thead>
        <tr>
          {tableHeaders.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction, rowIndex) => (
          <tr key={rowIndex}>
            {dataKeys.map((key) => (
              <td key={key}>{formatValue(key, transaction[key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TransactionsTable;
