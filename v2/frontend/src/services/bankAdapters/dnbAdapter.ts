import { RawTransaction } from '../../../../shared/types';
import { BankAdapter, RawRow } from './types';
import textPatterns from '../../data/categories-dnb-text.json';

const DNB_HEADERS = ['Dato', 'Forklaring', 'Rentedato', 'Ut fra konto', 'Inn på konto'];

const compiledPatterns = textPatterns.map((p) => ({
  regex: new RegExp(p.pattern, 'i'),
  merchantCategory: p.merchantCategory,
}));

function deriveMerchantCategory(text: string): string {
  for (const { regex, merchantCategory } of compiledPatterns) {
    if (regex.test(text)) {
      return merchantCategory;
    }
  }
  return '';
}

function deriveType(text: string, amount: number): string {
  if (amount > 0) return 'Innbetaling';
  if (/Visa-kjøp|Varekjøp|Nettgiro/i.test(text)) return 'Kjøp';
  if (/Overføring|Kontoregulering/i.test(text)) return 'Overføring';
  return 'Kjøp';
}

export const dnbAdapter: BankAdapter = {
  id: 'dnb',
  displayName: 'DNB',

  matchesHeaders(headers: string[]): boolean {
    return DNB_HEADERS.every((h) => headers.includes(h));
  },

  normalize(rows: RawRow[]): RawTransaction[] {
    const result: RawTransaction[] = [];

    for (const row of rows) {
      const utFraKonto = row['Ut fra konto'] as number | null;
      const innPåKonto = row['Inn på konto'] as number | null;

      if (utFraKonto == null && innPåKonto == null) continue;

      const amount = utFraKonto != null ? -Math.abs(utFraKonto) : Math.abs(innPåKonto!);
      const text = String(row['Forklaring'] ?? '').trim();
      const date = row['Dato'] as Date | string;
      const rentedato = row['Rentedato'] as Date | string;

      result.push({
        TransactionDate: date,
        BookDate: rentedato,
        ValueDate: rentedato,
        Text: text,
        Type: deriveType(text, amount),
        'Currency Amount': amount,
        'Currency Rate': 1,
        Currency: 'NOK',
        Amount: amount,
        'Merchant Area': '',
        'Merchant Category': deriveMerchantCategory(text),
      });
    }

    return result;
  },
};
