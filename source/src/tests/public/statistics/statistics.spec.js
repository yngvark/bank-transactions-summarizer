import statistics from "../../../public/statistics/statistics.js";

import * as d3 from "../../d3-7.8.4.js";

describe("statistics", () => {
  test("should look like expected", async () => {
    // When
    const result = await statistics.calculateTable(d3, testTransactionsWithCategory);

    // Then
    // // Note two gotchas
    // - the non-breaking space " ". This is intented behavior because implementation uses Intl.NumberFormat.
    // - the minus sign is "−" not "-". This is intented behavior because implementation uses Intl.NumberFormat.
    const expectedHeader =
        ["Category",                              "2022-01",    "2022-05",       "Sum",           "Average"];

    const expectedTableData = [
      ["Personlig forbruk ➡ Sport og fritid",     "−10 050", "−300",          "−10 350",    "−5 175"],

      ["Reise ➡ Reise og transport",              "−24",        "0",             "−24",           "−12"],
    ];

    const expectedFooter =
        ["Sum",                                   "−10 074", "−300",          "−10 374", "−5 187"];

    console.log(result.tableData);

    expect(result.header).toEqual(expectedHeader);
    expect(result.tableData).toEqual(expectedTableData);
    expect(result.footer).toEqual(expectedFooter);
  });

  const testTransactionsWithCategory = [
    {
      "TransactionDate": new Date("2022-01-01T00:00:00.000Z"),
      "Text": "HELLO GOLFKLUBB",
      "Type": "Kjøp",
      "Currency Amount": -10000,
      "Currency Rate": 1,
      "Currency": "NOK",
      "Amount": -10000,
      "Merchant Area": "OSLO         ",
      "Merchant Category": "Membership Clubs (Sports, Recreation",
      "BookDate": new Date("2022-01-01T00:00:00.000Z"),
      "ValueDate": new Date("2022-01-01T00:00:00.000Z"),
      "Category": "Personlig forbruk ➡ Sport og fritid"
    },
    {
      "TransactionDate": new Date("2022-01-01T00:00:00.000Z"),
      "Text": "OTHER GOLFKLUBB",
      "Type": "Kjøp",
      "Currency Amount": -50,
      "Currency Rate": 1,
      "Currency": "NOK",
      "Amount": -50,
      "Merchant Area": "OSLO         ",
      "Merchant Category": "Membership Clubs (Sports, Recreation",
      "BookDate": new Date("2022-01-01T00:00:00.000Z"),
      "ValueDate": new Date("2022-01-01T00:00:00.000Z"),
      "Category": "Personlig forbruk ➡ Sport og fritid"
    },
    {
      "TransactionDate": new Date("2022-01-01T00:00:00.000Z"),
      "Text": "VOISCOOTERS",
      "Type": "Kjøp",
      "Currency Amount": -23.78,
      "Currency Rate": 1,
      "Currency": "NOK",
      "Amount": -23.78,
      "Merchant Area": "OSLO         ",
      "Merchant Category": "Transportation Services, Not elsewhe",
      "BookDate": new Date("2022-01-01T00:00:00.000Z"),
      "ValueDate": new Date("2022-01-01T00:00:00.000Z"),
      "Category": "Reise ➡ Reise og transport"
    },
    {
      "TransactionDate": new Date("2022-05-01T23:00:00.000Z"),
      "Text": "HELLO GOLFKLUBB",
      "Type": "Kjøp",
      "Currency Amount": -300,
      "Currency Rate": 1,
      "Currency": "NOK",
      "Amount": -300,
      "Merchant Area": "OSLO         ",
      "Merchant Category": "Membership Clubs (Sports, Recreation",
      "BookDate": new Date("2022-05-01T23:00:00.000Z"),
      "ValueDate": new Date("2022-05-01T23:00:00.000Z"),
      "Category": "Personlig forbruk ➡ Sport og fritid"
    }
  ]
});
