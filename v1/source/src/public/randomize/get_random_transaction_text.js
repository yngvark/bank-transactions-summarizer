// Array of company names, transaction prefixes, and transaction suffixes
const companyNames = [
  "KOMPLETT.NO",
  "PAYPAL *SPOTIFY",
  "WWWFITNESSROOMNO",
  "AMAZON",
  "APPLE",
  "NETFLIX",
  "GOOGLE",
  "UBER",
  "AIRBNB",
  "ADOBE",
  "MICROSOFT",
  "ESPRESSO HOUSE"
];

const transactionPrefixes = [
  "Payment to ",
  "Subscription for ",
  "Purchase at ",
  "Online order at "
];

const transactionSuffixes = [
  "",
  " - Online",
  " - In-store",
  " - Mobile",
  " - Auto-payment"
];

// Generate realistic transaction text
function randomText(type) {
  if (type === "Innbetaling") {
    return "From 123456798012";
  }

  const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];

  const prefix = type === "Credit Voucher" ?
    "Refund for " :
    transactionPrefixes[Math.floor(Math.random() * transactionPrefixes.length)]
  ;

  const suffix = transactionSuffixes[Math.floor(Math.random() * transactionSuffixes.length)];

  return `${prefix}${companyName}${suffix}`;
}

export default randomText;