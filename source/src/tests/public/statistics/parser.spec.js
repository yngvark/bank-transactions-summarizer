import parser from "../../../public/statistics/parser.js"
import xlsxReader from "../../../public/xlsx_reader.js"
import XLSX from "xlsx"

import * as d3 from "../../d3-7.8.4.js"

const fs = require("fs")
import path from "path"

describe("parser", () => {
    test("should parse Excel transactions", async () => {
        // Given
        const categoryMapping = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../routes/categories/categories.json"), "utf8"));
        const transactions = xlsxReader.readXlsxFile(XLSX, path.join(__dirname, "test.xlsx"));

        // When
        const transactionsWithCategory = await parser.parse(categoryMapping, transactions);

        // Then
        const expected = [
            {
                "TransactionDate": new Date("2021-12-31T23:00:00.000Z"),
                "Text": 'HELLO GOLFKLUBB',
                "Type": 'Kjøp',
                "Currency Amount": -100,
                "Currency Rate": 1,
                "Currency": 'NOK',
                "Amount": -100,
                "Merchant Area": 'OSLO         ',
                "Merchant Category": 'Membership Clubs (Sports, Recreation',
                "BookDate": new Date("2023-03-31T22:00:00.000Z"),
                "ValueDate": new Date("2021-12-31T23:00:00.000Z"),
                "Category": 'Personlig forbruk ➡ Sport og fritid'
            }
        ];

        expect(transactionsWithCategory[0]).toEqual(expected[0]);
    });
});
