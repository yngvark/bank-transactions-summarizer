import ExcelJS from '@protobi/exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const columns = [
  'TransactionDate', 'BookDate', 'ValueDate', 'Text', 'Type',
  'Currency Amount', 'Currency Rate', 'Currency', 'Amount',
  'Merchant Area', 'Merchant Category',
];

const transactions = [
  {
    TransactionDate: '2023-03-15',
    BookDate: '2023-03-15',
    ValueDate: '2023-03-15',
    Text: 'Purchase at KOMPLETT.NO - Online',
    Type: 'Kjøp',
    'Currency Amount': -499.00,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -499.00,
    'Merchant Area': 'OSLO',
    'Merchant Category': 'Electronic Sales',
  },
  {
    TransactionDate: '2023-03-20',
    BookDate: '2023-03-20',
    ValueDate: '2023-03-20',
    Text: 'Payment to REMA 1000',
    Type: 'Kjøp',
    'Currency Amount': -234.50,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -234.50,
    'Merchant Area': 'OSLO',
    'Merchant Category': 'Grocery Stores, Supermarkets',
  },
  {
    TransactionDate: '2023-04-02',
    BookDate: '2023-04-02',
    ValueDate: '2023-04-02',
    Text: 'Subscription for NETFLIX',
    Type: 'Kjøp',
    'Currency Amount': -149.00,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -149.00,
    'Merchant Area': 'OSLO',
    'Merchant Category': 'Electronic Sales',
  },
  {
    TransactionDate: '2023-04-10',
    BookDate: '2023-04-10',
    ValueDate: '2023-04-10',
    Text: 'ESPRESSO HOUSE',
    Type: 'Kjøp',
    'Currency Amount': -65.00,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: -65.00,
    'Merchant Area': 'OSLO',
    'Merchant Category': 'Eating places and Restaurants',
  },
  {
    TransactionDate: '2023-04-15',
    BookDate: '2023-04-15',
    ValueDate: '2023-04-15',
    Text: 'From 123456798012',
    Type: 'Innbetaling',
    'Currency Amount': 25000.00,
    'Currency Rate': 1,
    Currency: 'NOK',
    Amount: 25000.00,
    'Merchant Area': '',
    'Merchant Category': '',
  },
];

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Transactions');

worksheet.columns = columns.map((key) => ({ header: key, key }));

for (const tx of transactions) {
  worksheet.addRow(tx);
}

await workbook.xlsx.writeFile(path.join(__dirname, 'test-transactions.xlsx'));

console.log('Generated test-transactions.xlsx');
