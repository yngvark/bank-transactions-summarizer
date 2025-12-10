import randomize from "../public/randomize/main";

describe("randomize", () => {
  test("should print some output", async () => {
    const csvContent = randomize();

    let refundCount = 0;
    let innbetalingCount = 0;
    let lineCount = 0;

    csvContent.split("\n").forEach(line => {
      if (line.includes("Credit Voucher")) {
        refundCount++;
      }
      if (line.includes("Innbetaling")) {
        innbetalingCount++;
      }
      lineCount++;
    });

    console.log(`Refund count: ${refundCount} Innbetaling count: ${innbetalingCount} Total number of lines: ${lineCount}`);
  });
});