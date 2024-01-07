//import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";
import { readFileSync } from 'fs';

function readXlsxFile(XLSX, filePath) {
    // Read the file into a buffer
    const buffer = readFileSync(filePath);

    // Parse the buffer to a workbook
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    // Process the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to JSON
    const transactions = XLSX.utils.sheet_to_json(worksheet);
    return transactions;
}

export default {
    readXlsxFile
}
