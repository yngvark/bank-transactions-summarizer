import statistics from "../public/statistics";
import * as d3 from "./d3-7.8.4.js";

const fs = require("fs");
import path from "path";

describe("statistics", () => {
  test("should look like expected", async () => {
    // Given
    const dataDir = process.env["DATA_DIR"]
    const categoryMapping = JSON.parse(fs.readFileSync(path.join(dataDir, "categories.json"), "utf8"));
    const data = fs.readFileSync(path.join(__dirname, "test.csv"), "utf8");
    const csv = d3.csvParse(data);

    // When
    const result = await statistics.calculate(d3, categoryMapping, csv);

    // Then
    // // Note two gotchas
    // - the non-breaking space " ". This is intented behavior because implementation uses Intl.NumberFormat.
    // - the minus sign is "−" not "-". This is intented behavior because implementation uses Intl.NumberFormat.
    const expectedHeader = ["Category", "2022-01", "2022-02", "2022-03", "Sum"];

    const expectedTableData = [
      ["Personlig forbruk ➡ Sport og fritid", "−10 150", "0", "0", "−10 150"],
      ["Reise ➡ Reise og transport", "0", "−60", "−39", "−99"],
      ["Ukjent kategori", "0", "0", "0", "0"]
    ];

    const expectedFooter = ["Sum", "−10 150", "−60", "−39", "−10 249"];

    console.log(result.tableData);

    expect(result.header).toEqual(expectedHeader);
    expect(result.tableData).toEqual(expectedTableData);
    expect(result.footer).toEqual(expectedFooter);
  });
});