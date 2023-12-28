import path from "path";
import * as ExcelJS from 'exceljs'

async function getTestExcelData() {
    const filePath = path.join(__dirname, "test.xlsx")
    console.log("Returning file: ", filePath)

    const data = await readExcel(filePath)

    return data
}

async function getExcelData() {
    const dataDir = process.env["DATA_DIR"];
    console.log("DATA_DIR: ", dataDir);

    const filePath = path.join(dataDir, "transactions.xlsx")
    console.log("Returning file: ", filePath)

    const data = await readExcel(filePath)

    return data
}

async function readExcel(filePath) {
    let workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let worksheet = workbook.getWorksheet(1); // assuming you want the first sheet
    let data = [];
    let headers = [];

    worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
        if (rowNumber === 1) {
            // Read headers from the first row
            row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
                headers[colNumber] = cell.value;
            });
        } else {
            // Process other rows as data
            let rowData = {};
            row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
                rowData[headers[colNumber]] = cell.value;
            });
            data.push(rowData);
        }
    });

    return data;
}

export default {
    getTestExcelData,
    getExcelData
}