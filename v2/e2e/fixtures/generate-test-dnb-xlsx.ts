import ExcelJS from '@protobi/exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const columns = ['Dato', 'Forklaring', 'Rentedato', 'Ut fra konto', 'Inn på konto'];

const transactions = [
  {
    Dato: '2023-03-15',
    Forklaring: 'Visa-kjøp REMA 1000 Oslo',
    Rentedato: '2023-03-15',
    'Ut fra konto': 234.5,
    'Inn på konto': null,
  },
  {
    Dato: '2023-03-20',
    Forklaring: 'Visa-kjøp Espresso House Grønland',
    Rentedato: '2023-03-20',
    'Ut fra konto': 65,
    'Inn på konto': null,
  },
  {
    Dato: '2023-04-02',
    Forklaring: 'Overføring Innland 1778 Kristoffer Ødemark',
    Rentedato: '2023-04-02',
    'Ut fra konto': null,
    'Inn på konto': 1500,
  },
  {
    Dato: '2023-04-10',
    Forklaring: 'Visa-kjøp Elkjøp City Syd',
    Rentedato: '2023-04-10',
    'Ut fra konto': 499,
    'Inn på konto': null,
  },
  {
    Dato: '2023-04-15',
    Forklaring: 'Kontoregulering 541 Fast Overføring',
    Rentedato: '2023-04-15',
    'Ut fra konto': 2000,
    'Inn på konto': null,
  },
];

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Kontoutskrift');

worksheet.columns = columns.map((key) => ({ header: key, key }));

for (const tx of transactions) {
  worksheet.addRow(tx);
}

await workbook.xlsx.writeFile(path.join(__dirname, 'test-transactions-dnb.xlsx'));

console.log('Generated test-transactions-dnb.xlsx');
