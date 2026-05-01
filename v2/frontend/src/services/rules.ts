import { Transaction, Rule, MatchKind, RuleField } from '../../../shared/types';

export function isValidRegex(pattern: string): boolean {
  if (!pattern) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export function matchesRule(tx: Transaction, rule: Rule): boolean {
  const target = rule.field === 'text' ? tx.Text : tx['Merchant Category'];
  if (!target) return false;
  switch (rule.match) {
    case 'substring':
      return target.toLowerCase().includes(rule.pattern.toLowerCase());
    case 'exact':
      return target === rule.pattern;
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(target);
      } catch {
        return false;
      }
  }
}

export function findRuleForTransaction(tx: Transaction, rules: Rule[]): Rule | undefined {
  return rules.find((rule) => matchesRule(tx, rule));
}

export function applyRules(transactions: Transaction[], rules: Rule[]): Transaction[] {
  if (rules.length === 0) return transactions;
  return transactions.map((tx) => {
    const rule = findRuleForTransaction(tx, rules);
    if (!rule) return tx;
    return { ...tx, Category: rule.category.join(' ➡ ') };
  });
}

export function getMatchingTransactions(
  transactions: Transaction[],
  pattern: string,
  match: MatchKind,
  field: RuleField = 'text',
): Transaction[] {
  if (!pattern) return [];
  if (match === 'regex' && !isValidRegex(pattern)) return [];
  const probe: Rule = { id: '__preview', field, match, pattern, category: ['', ''] };
  return transactions.filter((tx) => matchesRule(tx, probe));
}
