import excelHelper from "../../../routes/transactions/excelHelper.js";

describe("parser", () => {
    test("should parse Excel format", async () => {
        // When
        const transactions = await excelHelper.getTestDataFromExcel();

        // Then
        const expected = [
            {
                "TransactionDate": new Date("2022-01-01T00:00:00.000Z"),
                "Text": 'HELLO GOLFKLUBB',
                "Type": 'Kjøp',
                "Currency Amount": -100,
                "Currency Rate": 1,
                "Currency": 'NOK',
                "Amount": -10000,
                "Merchant Area": 'OSLO',
                "Merchant Category": 'Membership Clubs (Sports, Recreation',
                "BookDate": new Date("2022-01-01T00:00:00.000Z"),
                "ValueDate": new Date("2022-02-01T00:00:00.000Z"),
            }
        ];

        expect(transactions[0]).toEqual(expected[0]);
    });

});