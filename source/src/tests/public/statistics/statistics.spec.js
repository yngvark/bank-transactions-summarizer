import statistics from "../../../public/statistics/statistics.js";
import parser from "../../../public/statistics/parser.js";

import * as d3 from "../../d3-7.8.4.js";

const fs = require("fs");
import path from "path";

describe("statistics", () => {
  test("should look like expected", async () => {
    // Given
    const categoriesFile = "../../../routes/categories/categories.json"
    const categoryMapping = JSON.parse(fs.readFileSync(path.join(__dirname, categoriesFile), "utf8"));

    const csvFile = "test.csv";
    const data = fs.readFileSync(path.join(__dirname, csvFile), "utf8");
    const transactions = d3.csvParse(data);
    const transactionsWithCategory = await parser.parse(categoryMapping, transactions);

    // When
    const result = await statistics.calculate(d3, transactionsWithCategory);

    // Then
    // // Note two gotchas
    // - the non-breaking space " ". This is intented behavior because implementation uses Intl.NumberFormat.
    // - the minus sign is "−" not "-". This is intented behavior because implementation uses Intl.NumberFormat.
    const expectedHeader = ["Category", "2022-01", "2022-02", "2022-03", "Sum", "Average"];

    const expectedTableData = [
      ["Personlig forbruk ➡ Sport og fritid", "−10 150", "0", "0", "−10 150", "−3 383"],
      ["Reise ➡ Reise og transport", "0", "−60", "−39", "−99", "−33"],
      ["Ukjent kategori", "0", "0", "0", "0", "0"]
    ];

    const expectedFooter = ["Sum", "−10 150", "−60", "−39", "−10 249", "−3 416"];

    console.log(result.tableData);

    expect(result.header).toEqual(expectedHeader);
    expect(result.tableData).toEqual(expectedTableData);
    expect(result.footer).toEqual(expectedFooter);
  });
});