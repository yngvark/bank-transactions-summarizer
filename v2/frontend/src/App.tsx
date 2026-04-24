import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RawTransaction,
  Transaction,
  GroupedStatistics,
  CategoryMapping,
  TextPatternRule,
  RuleType,
} from '../../shared/types';
import FileUpload from './components/FileUpload';
import SearchControls from './components/SearchControls';
import StatisticsTable from './components/StatisticsTable';
import TransactionsTable from './components/TransactionsTable';
import DisplaySettings, { applyDisplaySettings } from './components/DisplaySettings';
import CategoryDropdown from './components/CategoryDropdown';
import RuleDialog from './components/RuleDialog';
import RulesPanel from './components/RulesPanel';
import Toast from './components/Toast';
import { parseTransactions } from './services/parser';
import { calculateStatistics } from './services/statistics';
import {
  applyRules,
  findRuleForTransaction,
  getMatchingTransactions,
  loadRules,
  saveRules,
} from './services/rules';
import { generateRandomTransactions } from './utils/randomize';
import categoriesJson from './data/categories.json';

const categoryMapping = categoriesJson as unknown as CategoryMapping;

type DropdownState = { anchor: DOMRect; tx: Transaction } | null;

type DialogState =
  | null
  | {
      mode: 'create' | 'update' | 'delete';
      category: [string, string];
      initialPattern: string;
      initialType: RuleType;
      ruleId?: string;
    };

function App() {
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<GroupedStatistics | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('No file loaded');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [density, setDensity] = useState('normal');

  const [rules, setRules] = useState<TextPatternRule[]>(() => loadRules());
  const [toast, setToast] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<DropdownState>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    applyDisplaySettings(density);
  }, [density]);

  const processTransactions = useCallback(async () => {
    if (!categoryMapping || allTransactions.length === 0) return;

    let filtered = allTransactions.filter((row) =>
      row.Text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (periodFrom) {
      filtered = filtered.filter(
        (row) => row.BookDate == null || new Date(row.BookDate) >= new Date(periodFrom)
      );
    }

    if (periodTo) {
      filtered = filtered.filter(
        (row) => row.BookDate == null || new Date(row.BookDate) <= new Date(periodTo)
      );
    }

    const withMcCat = parseTransactions(categoryMapping, filtered);
    const withRules = applyRules(withMcCat, rules);
    const stats = calculateStatistics(withRules);

    setFilteredTransactions(withRules);
    setStatistics(stats);
  }, [allTransactions, searchTerm, periodFrom, periodTo, rules]);

  useEffect(() => {
    processTransactions();
  }, [processTransactions]);

  useEffect(() => {
    if (allTransactions.length === 0) return;

    const dates = allTransactions
      .flatMap((d) => [d.TransactionDate, d.BookDate])
      .filter((d): d is Date | string => d != null && d !== '')
      .map((d) => new Date(d));

    if (dates.length === 0) return;

    const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const year = latestDate.getFullYear();
    const yearStart = `${year}-01-01`;

    const latestDateISO = `${latestDate.getFullYear()}-${String(
      latestDate.getMonth() + 1
    ).padStart(2, '0')}-${String(latestDate.getDate()).padStart(2, '0')}`;

    setPeriodFrom(yearStart);
    setPeriodTo(latestDateISO);
  }, [allTransactions]);

  const handleFileLoad = (transactions: RawTransaction[], fileName: string) => {
    setAllTransactions(transactions);
    setCurrentFileName(fileName);
  };

  const handleRandomize = () => {
    const transactions = generateRandomTransactions();
    setAllTransactions(transactions);
    setCurrentFileName('random-data.xlsx');
  };

  const persistRules = useCallback((next: TextPatternRule[]) => {
    setRules(next);
    saveRules(next);
  }, []);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const rulesRef = useMemo(() => rules, [rules]);

  const handleAddRule = useCallback(
    (rule: TextPatternRule) => {
      const count = getMatchingTransactions(filteredTransactions, rule.pattern, rule.type).length;
      persistRules([...rulesRef, rule]);
      setDialog(null);
      showToast(
        `Rule created — ${count} transaction${count === 1 ? '' : 's'} updated`
      );
    },
    [filteredTransactions, persistRules, rulesRef, showToast]
  );

  const handleUpdateRule = useCallback(
    (rule: TextPatternRule) => {
      const count = getMatchingTransactions(filteredTransactions, rule.pattern, rule.type).length;
      persistRules(rulesRef.map((r) => (r.id === rule.id ? rule : r)));
      setDialog(null);
      showToast(
        `Rule updated — ${count} transaction${count === 1 ? '' : 's'} affected`
      );
    },
    [filteredTransactions, persistRules, rulesRef, showToast]
  );

  const handleDeleteRule = useCallback(
    (id: string) => {
      const removed = rulesRef.find((r) => r.id === id);
      const count = removed
        ? getMatchingTransactions(filteredTransactions, removed.pattern, removed.type).length
        : 0;
      persistRules(rulesRef.filter((r) => r.id !== id));
      setDialog(null);
      showToast(`Rule deleted — ${count} transaction${count === 1 ? '' : 's'} reverted`);
    },
    [filteredTransactions, persistRules, rulesRef, showToast]
  );

  const handleReorderRule = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const idx = rulesRef.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= rulesRef.length) return;
      const next = [...rulesRef];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      persistRules(next);
    },
    [persistRules, rulesRef]
  );

  const handleCategoryClick = useCallback(
    (txIndex: number, anchor: DOMRect) => {
      const tx = filteredTransactions[txIndex];
      if (!tx) return;
      setDropdown({ anchor, tx });
    },
    [filteredTransactions]
  );

  const handleDropdownPick = useCallback(
    (primary: string, sub: string) => {
      if (!dropdown) return;
      const existing = findRuleForTransaction(dropdown.tx, rulesRef);
      if (existing) {
        setDialog({
          mode: 'update',
          category: [primary, sub],
          initialPattern: existing.pattern,
          initialType: existing.type,
          ruleId: existing.id,
        });
      } else {
        setDialog({
          mode: 'create',
          category: [primary, sub],
          initialPattern: dropdown.tx.Text,
          initialType: 'substring',
        });
      }
      setDropdown(null);
    },
    [dropdown, rulesRef]
  );

  const handleDropdownRemove = useCallback(() => {
    if (!dropdown) return;
    const existing = findRuleForTransaction(dropdown.tx, rulesRef);
    if (!existing) return;
    setDialog({
      mode: 'delete',
      category: existing.category,
      initialPattern: existing.pattern,
      initialType: existing.type,
      ruleId: existing.id,
    });
    setDropdown(null);
  }, [dropdown, rulesRef]);

  const handleRulesPanelEdit = useCallback((rule: TextPatternRule) => {
    setDialog({
      mode: 'update',
      category: rule.category,
      initialPattern: rule.pattern,
      initialType: rule.type,
      ruleId: rule.id,
    });
  }, []);

  const handleRulesPanelDelete = useCallback((rule: TextPatternRule) => {
    setDialog({
      mode: 'delete',
      category: rule.category,
      initialPattern: rule.pattern,
      initialType: rule.type,
      ruleId: rule.id,
    });
  }, []);

  const dropdownExistingRule =
    dropdown != null ? findRuleForTransaction(dropdown.tx, rules) : undefined;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bank Transactions</h1>
        <p className="app-subtitle">Analyze and categorize your spending</p>
      </header>

      <main className="app-content">
        <section className="controls-section">
          <FileUpload currentFileName={currentFileName} onFileLoad={handleFileLoad} />

          <SearchControls
            searchTerm={searchTerm}
            periodFrom={periodFrom}
            periodTo={periodTo}
            onSearchChange={setSearchTerm}
            onPeriodFromChange={setPeriodFrom}
            onPeriodToChange={setPeriodTo}
            onRandomize={handleRandomize}
          />
        </section>

        {statistics && (
          <section className="statistics-section">
            <h2>Spending by Category</h2>
            <StatisticsTable statistics={statistics} />
            <DisplaySettings density={density} onDensityChange={setDensity} />
          </section>
        )}

        <RulesPanel
          rules={rules}
          onReorder={handleReorderRule}
          onEdit={handleRulesPanelEdit}
          onDelete={handleRulesPanelDelete}
        />

        <section className="transactions-section">
          <h2>
            Transactions{' '}
            {filteredTransactions.length > 0 && (
              <span className="count">({filteredTransactions.length})</span>
            )}
          </h2>
          <TransactionsTable
            transactions={filteredTransactions}
            onCategoryClick={handleCategoryClick}
          />
        </section>
      </main>

      {dropdown && (
        <CategoryDropdown
          anchor={dropdown.anchor}
          categoryMapping={categoryMapping}
          existingRule={dropdownExistingRule}
          onPick={handleDropdownPick}
          onRemove={handleDropdownRemove}
          onClose={() => setDropdown(null)}
        />
      )}

      {dialog && (
        <RuleDialog
          mode={dialog.mode}
          category={dialog.category}
          initialPattern={dialog.initialPattern}
          initialType={dialog.initialType}
          ruleId={dialog.ruleId}
          transactions={filteredTransactions}
          onSave={(rule) => {
            if (dialog.mode === 'create') {
              handleAddRule(rule);
            } else {
              handleUpdateRule(rule);
            }
          }}
          onDelete={() => {
            if (dialog.ruleId) handleDeleteRule(dialog.ruleId);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default App;
