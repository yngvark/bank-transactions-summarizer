import path from "path";
import exceljs from "exceljs";

async function getTestDataFromExcel() {
    const filePath = path.join(__dirname, "test.xlsx")
    console.log("Returning file: ", filePath)

    const data = await readExcel(filePath)

    return data
}

async function readExcel(filePath) {
    let workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(filePath);

    let worksheet = workbook.getWorksheet(1); // assuming you want the first sheet
    let data = [];
    let headers = [];

    worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
        if (rowNumber === 1) {
            // Read headers from the first row
            row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                headers[colNumber] = cell.value;
            });
        } else {
            // Process other rows as data
            let rowData = {};
            row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                rowData[headers[colNumber]] = cell.value;
            });
            data.push(rowData);
        }
    });

    return data;
}

export default {
    getTestDataFromExcel
}