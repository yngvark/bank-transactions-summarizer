import { RawTransaction } from '../../../shared/types';

const merchantCategories = [
  'Electronic Sales',
  'Sporting Goods Stores',
  'Passenger Railways',
  'Miscellaneous and Specialty Retail S',
  'Airlines',
  'Travel Agencies and Tour Operations',
  'Shoe Stores',
  'Misc. Food Stores – Convenience Stor',
  'Airlines, Air Carriers ( not listed',
  'SAS',
  'Miscellaneous Personal Services ( no',
  'Department Stores',
  'Lodging – Hotels, Motels, Resorts, C',
  'Variety Stores',
  'Financial Institutions – ATM',
  'Eating places and Restaurants',
  'Duty Free Store',
  'Transportation Services, Not elsewhe',
  'Grocery Stores, Supermarkets',
  'Membership Organizations ( Not Elsew',
  'Taxicabs and Limousines',
  'Money Orders – Wire Transfer',
  'Book Stores',
  'Bus Lines, Including Charters, Tour',
  'Fast Food Restaurants',
  'Package Stores – Beer, Wine, and Liq',
  'Tailors, Seamstress, Mending, and Al',
  'Automotive Service Shops',
  'Financial Institutions – Merchandise',
];

const companyNames = [
  'KOMPLETT.NO',
  'PAYPAL *SPOTIFY',
  'WWWFITNESSROOMNO',
  'AMAZON',
  'APPLE',
  'NETFLIX',
  'GOOGLE',
  'UBER',
  'AIRBNB',
  'ADOBE',
  'MICROSOFT',
  'ESPRESSO HOUSE',
];

const transactionPrefixes = [
  'Payment to ',
  'Subscription for ',
  'Purchase at ',
  'Online order at ',
];

const transactionSuffixes = ['', ' - Online', ' - In-store', ' - Mobile', ' - Auto-payment'];

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomMerchantCategory(): string {
  return merchantCategories[Math.floor(Math.random() * merchantCategories.length)];
}

function randomType(): string {
  const randomNumber = Math.random();

  if (randomNumber < 0.96) {
    return 'Kjøp';
  } else if (randomNumber < 0.99) {
    return 'Innbetaling';
  } else {
    return 'Credit Voucher';
  }
}

function randomCurrencyAmount(type: string): number {
  return type === 'Kjøp'
    ? parseFloat((Math.random() * 1000).toFixed(2)) * -1
    : parseFloat((Math.random() * 1000).toFixed(2));
}

function randomText(type: string): string {
  if (type === 'Innbetaling') {
    return 'From 123456798012';
  }

  const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];

  const prefix =
    type === 'Credit Voucher'
      ? 'Refund for '
      : transactionPrefixes[Math.floor(Math.random() * transactionPrefixes.length)];

  const suffix = transactionSuffixes[Math.floor(Math.random() * transactionSuffixes.length)];

  return `${prefix}${companyName}${suffix}`;
}

function generateRandomTransaction(): RawTransaction {
  const transactionDate = randomDate(new Date('2022-01-01'), new Date('2023-04-30'));
  const type = randomType();
  const text = randomText(type);
  const currencyAmount = randomCurrencyAmount(type);
  const currencyRate = Math.floor(Math.random() * 5) + 1;
  const currency = 'NOK';
  const amount = parseFloat((currencyAmount * currencyRate).toFixed(2));
  const merchantArea = 'OSLO';
  const merchantCategory = randomMerchantCategory();
  const bookDate = transactionDate;
  const valueDate = transactionDate;

  return {
    TransactionDate: transactionDate,
    Text: text,
    Type: type,
    'Currency Amount': currencyAmount,
    'Currency Rate': currencyRate,
    Currency: currency,
    Amount: amount,
    'Merchant Area': merchantArea,
    'Merchant Category': merchantCategory,
    BookDate: bookDate,
    ValueDate: valueDate,
  };
}

export function generateRandomTransactions(): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  for (let i = 0; i < 500; i++) {
    transactions.push(generateRandomTransaction());
  }

  transactions.sort((a, b) => {
    const dateA = a.TransactionDate instanceof Date ? a.TransactionDate : new Date(a.TransactionDate);
    const dateB = b.TransactionDate instanceof Date ? b.TransactionDate : new Date(b.TransactionDate);
    return dateA.getTime() - dateB.getTime();
  });

  return transactions;
}
