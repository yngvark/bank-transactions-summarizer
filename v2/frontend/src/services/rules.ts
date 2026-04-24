import { RuleType, TextPatternRule, Transaction } from '../../../shared/types';

export const RULES_STORAGE_KEY = 'bts-rules-v1';

export function isValidRegex(pattern: string): boolean {
  if (!pattern) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export function matchesPattern(text: string, rule: TextPatternRule): boolean {
  if (!text) return false;
  if (rule.type === 'substring') {
    return text.toLowerCase().includes(rule.pattern.toLowerCase());
  }
  try {
    return new RegExp(rule.pattern, 'i').test(text);
  } catch {
    return false;
  }
}

export function findRuleForTransaction(
  tx: Transaction,
  rules: TextPatternRule[]
): TextPatternRule | undefined {
  return rules.find((rule) => matchesPattern(tx.Text, rule));
}

export function applyRules(
  transactions: Transaction[],
  rules: TextPatternRule[]
): Transaction[] {
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
  type: RuleType
): Transaction[] {
  if (!pattern) return [];
  if (type === 'regex' && !isValidRegex(pattern)) return [];
  const pseudoRule: TextPatternRule = {
    id: '__preview',
    type,
    pattern,
    category: ['', ''],
  };
  return transactions.filter((tx) => matchesPattern(tx.Text, pseudoRule));
}

export function loadRules(): TextPatternRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRules(rules: TextPatternRule[]): void {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}
