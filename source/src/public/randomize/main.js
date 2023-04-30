// noinspection UnnecessaryLocalVariableJS

import merchant_categories from "./merchant_categories.js";
import randomText from "./get_random_transaction_text.js";

// Generate random date within specific range
function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Select random merchant category
function randomMerchantCategory() {
  return merchant_categories[Math.floor(Math.random() * merchant_categories.length)];
}

function randomType() {
  const randomNumber = Math.random();

  if (randomNumber < 0.96) {
    return "Kjøp";
  } else if (randomNumber < 0.99) { // Adjusted the threshold
    return "Innbetaling";
  } else {
    return "Credit Voucher";
  }
}

function randomCurrencyAmount(type) {
  return type === "Kjøp" ?
    (Math.random() * 1000).toFixed(2) * -1 :
    (Math.random() * 1000).toFixed(2);
}

// Generate random CSV rows
function generateRandomRow() {
  const transactionDate = randomDate(new Date("2022-01-01"), new Date("2023-04-30"));
  const type = randomType();
  const text = randomText(type);
  const currencyAmount = randomCurrencyAmount(type);
  const currencyRate = Math.floor(Math.random() * 5) + 1;
  const currency = "NOK";
  const amount = (currencyAmount * currencyRate).toFixed(2);
  const merchantArea = "OSLO";
  const merchantCategory = randomMerchantCategory();
  const bookDate = transactionDate;
  const valueDate = transactionDate;

  return [
    transactionDate.toLocaleDateString(),
    text,
    type,
    currencyAmount,
    currencyRate,
    currency,
    amount,
    merchantArea,
    merchantCategory,
    bookDate.toLocaleDateString(),
    valueDate.toLocaleDateString()
  ];
}

// Write rows to CSV file
function generateCSV() {
  const rows = [];
  for (let i = 0; i < 500; i++) {
    rows.push(generateRandomRow());
  }

  // Sort rows by transactionDate (earliest first)
  rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  const header = [
    "TransactionDate",
    "Text",
    "Type",
    "Currency Amount",
    "Currency Rate",
    "Currency",
    "Amount",
    "Merchant Area",
    "Merchant Category",
    "BookDate",
    "ValueDate"
  ];

  let csvContent = header.join(",") + "\n";
  rows.forEach(row => {
    csvContent += row.join(",") + "\n";
  });

  return csvContent;
}

export default generateCSV;
