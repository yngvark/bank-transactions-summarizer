import generateRandomTransactions from "../public/randomize/main";

describe("generateRandomTransactions", () => {
  test("should print some output", async () => {
    const transactions = generateRandomTransactions();

    let refundCount = 0;
    let innbetalingCount = 0;
    let lineCount = 0;

    transactions.forEach(t => {
      if (t.Type.includes("Credit Voucher")) {
        refundCount++;
      } else if (t.Type.includes("Innbetaling")) {
        innbetalingCount++;
      }

      lineCount++;
    });

    console.log(`Refund count: ${refundCount} Innbetaling count: ${innbetalingCount} Total number of lines: ${lineCount}`);
  });
});