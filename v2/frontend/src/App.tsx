import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RawTransaction,
  Transaction,
  GroupedStatistics,
  Rule,
  RuleField,
  MatchKind,
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
import ConfigToolbar from './components/ConfigToolbar';
import LoadedFilePill from './components/LoadedFilePill';
import { parseTransactions } from './services/parser';
import { calculateStatistics } from './services/statistics';
import {
  applyRules,
  findRuleForTransaction,
  getMatchingTransactions,
} from './services/rules';
import { transactionMatchesCategoryFilter } from './services/categoryFilter';
import { generateRandomTransactions } from './utils/randomize';
import {
  loadTransactions,
  saveTransactions,
} from './services/transactionPersistence';
import { useConfig } from './context/useConfig';

type DropdownState = { anchor: DOMRect; tx: Transaction } | null;

type DialogState =
  | null
  | {
      mode: 'create' | 'update' | 'delete';
      category: [string, string];
      initialField: RuleField;
      initialMatch: MatchKind;
      initialPattern: string;
      ruleId?: string;
    };

function App() {
  const { config, updateRules } = useConfig();
  const rules = config.rules;
  // User-created rules: shown in the panel and considered when looking up an
  // "existing rule" for a clicked transaction. Seeded merchant-category rules
  // (from categories.json, id prefix `seed-`) are evaluated for transaction
  // categorization but kept out of the user-facing list.
  const userRules = useMemo(() => rules.filter((r) => !r.id.startsWith('seed-')), [rules]);
  const density = config.settings.density;

  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<GroupedStatistics | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('No file loaded');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<DropdownState>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    applyDisplaySettings(density);
  }, [density]);

  // Restore the most recently uploaded transactions across page refreshes.
  // Runs once on mount; explicit re-uploads or randomize calls overwrite this.
  useEffect(() => {
    const stored = loadTransactions();
    if (stored != null) {
      setAllTransactions(stored.transactions);
      setCurrentFileName(stored.fileName);
    }
  }, []);

  const processTransactions = useCallback(async () => {
    if (allTransactions.length === 0) return;

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

    const parsed = parseTransactions(filtered);
    const withRules = applyRules(parsed, rules);
    const stats = calculateStatistics(withRules);

    setFilteredTransactions(withRules);
    setStatistics(stats);
  }, [allTransactions, searchTerm, periodFrom, periodTo, rules]);

  useEffect(() => {
    processTransactions();
  }, [processTransactions]);

  const displayedTransactions = useMemo(
    () =>
      selectedCategory
        ? filteredTransactions.filter((t) =>
            transactionMatchesCategoryFilter(t.Category, selectedCategory)
          )
        : filteredTransactions,
    [filteredTransactions, selectedCategory]
  );

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const tx of allTransactions) {
      for (const d of [tx.TransactionDate, tx.BookDate]) {
        if (d == null || d === '') continue;
        const year = new Date(d).getFullYear();
        if (Number.isFinite(year)) set.add(year);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [allTransactions]);

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
    saveTransactions(fileName, transactions);
  };

  const handleRandomize = () => {
    const transactions = generateRandomTransactions();
    const fileName = 'random-data.xlsx';
    setAllTransactions(transactions);
    setCurrentFileName(fileName);
    saveTransactions(fileName, transactions);
  };

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const rulesRef = useMemo(() => rules, [rules]);

  const handleAddRule = useCallback(
    (rule: Rule) => {
      const count = getMatchingTransactions(filteredTransactions, rule.pattern, rule.match, rule.field).length;
      // Prepend user rules so they take priority over seeded rules.
      updateRules([rule, ...rulesRef]);
      setDialog(null);
      showToast(`Rule created — ${count} transaction${count === 1 ? '' : 's'} updated`);
    },
    [filteredTransactions, updateRules, rulesRef, showToast]
  );

  const handleUpdateRule = useCallback(
    (rule: Rule) => {
      const count = getMatchingTransactions(filteredTransactions, rule.pattern, rule.match, rule.field).length;
      updateRules(rulesRef.map((r) => (r.id === rule.id ? rule : r)));
      setDialog(null);
      showToast(`Rule updated — ${count} transaction${count === 1 ? '' : 's'} affected`);
    },
    [filteredTransactions, updateRules, rulesRef, showToast]
  );

  const handleDeleteRule = useCallback(
    (id: string) => {
      const removed = rulesRef.find((r) => r.id === id);
      const count = removed
        ? getMatchingTransactions(filteredTransactions, removed.pattern, removed.match, removed.field).length
        : 0;
      updateRules(rulesRef.filter((r) => r.id !== id));
      setDialog(null);
      showToast(`Rule deleted — ${count} transaction${count === 1 ? '' : 's'} reverted`);
    },
    [filteredTransactions, updateRules, rulesRef, showToast]
  );

  const handleReorderRule = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const idx = rulesRef.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= rulesRef.length) return;
      const next = [...rulesRef];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      updateRules(next);
    },
    [updateRules, rulesRef]
  );

  const handleCategoryClick = useCallback(
    (txIndex: number, anchor: DOMRect) => {
      const tx = displayedTransactions[txIndex];
      if (!tx) return;
      setDropdown({ anchor, tx });
    },
    [displayedTransactions]
  );

  const handleDropdownPick = useCallback(
    (primary: string, sub: string) => {
      if (!dropdown) return;
      // Only consider user-created rules as "existing rules" — seeded rules
      // are automatic and should not block creating a new user rule.
      const existing = findRuleForTransaction(dropdown.tx, userRules);
      if (existing) {
        setDialog({
          mode: 'update',
          category: [primary, sub],
          initialField: existing.field,
          initialMatch: existing.match,
          initialPattern: existing.pattern,
          ruleId: existing.id,
        });
      } else {
        const merchantCat = dropdown.tx['Merchant Category'];
        const useMerchantCat = !!merchantCat;
        setDialog({
          mode: 'create',
          category: [primary, sub],
          initialField: useMerchantCat ? 'merchantCategory' : 'text',
          initialMatch: useMerchantCat ? 'exact' : 'substring',
          initialPattern: useMerchantCat ? merchantCat : dropdown.tx.Text,
        });
      }
      setDropdown(null);
    },
    [dropdown, userRules]
  );

  const handleDropdownRemove = useCallback(() => {
    if (!dropdown) return;
    const existing = findRuleForTransaction(dropdown.tx, userRules);
    if (!existing) return;
    setDialog({
      mode: 'delete',
      category: existing.category,
      initialField: existing.field,
      initialMatch: existing.match,
      initialPattern: existing.pattern,
      ruleId: existing.id,
    });
    setDropdown(null);
  }, [dropdown, userRules]);

  const handleRulesPanelEdit = useCallback((rule: Rule) => {
    setDialog({
      mode: 'update',
      category: rule.category,
      initialField: rule.field,
      initialMatch: rule.match,
      initialPattern: rule.pattern,
      ruleId: rule.id,
    });
  }, []);

  const handleRulesPanelDelete = useCallback((rule: Rule) => {
    setDialog({
      mode: 'delete',
      category: rule.category,
      initialField: rule.field,
      initialMatch: rule.match,
      initialPattern: rule.pattern,
      ruleId: rule.id,
    });
  }, []);

  // Only show "Remove rule" for user-created rules, not seeded rules.
  const dropdownExistingRule =
    dropdown != null ? findRuleForTransaction(dropdown.tx, userRules) : undefined;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <h1>Bank Transactions</h1>
          <p className="app-subtitle">Analyze and categorize your spending</p>
        </div>
        <ConfigToolbar
          onError={showToast}
          onSuccess={() =>
            showToast(
              allTransactions.length === 0
                ? 'Configuration imported. Upload an Excel file to see transactions.'
                : 'Configuration imported.'
            )
          }
        />
      </header>

      <main className="app-content">
        <section className="controls-section">
          <FileUpload currentFileName={currentFileName} onFileLoad={handleFileLoad} />

          <SearchControls
            searchTerm={searchTerm}
            periodFrom={periodFrom}
            periodTo={periodTo}
            availableYears={availableYears}
            onSearchChange={setSearchTerm}
            onPeriodFromChange={setPeriodFrom}
            onPeriodToChange={setPeriodTo}
            onRandomize={handleRandomize}
          />
        </section>

        {allTransactions.length > 0 && (
          <LoadedFilePill fileName={currentFileName} count={allTransactions.length} />
        )}

        {statistics && (
          <section className="statistics-section">
            <h2>Spending by Category</h2>
            <StatisticsTable
              statistics={statistics}
              onToast={showToast}
              selectedCategory={selectedCategory}
              onSelectCategoryFilter={(joinedPath) =>
                setSelectedCategory((prev) => (prev === joinedPath ? null : joinedPath))
              }
            />
            <DisplaySettings />
          </section>
        )}

        <RulesPanel
          rules={userRules}
          onReorder={handleReorderRule}
          onEdit={handleRulesPanelEdit}
          onDelete={handleRulesPanelDelete}
        />

        <section className="transactions-section">
          <h2>
            Transactions{' '}
            {displayedTransactions.length > 0 && (
              <span className="count">({displayedTransactions.length})</span>
            )}
          </h2>
          {selectedCategory && (
            <div className="category-filter-pill" data-testid="category-filter-pill">
              <span aria-hidden>▾</span>
              <span className="category-filter-pill-label">
                Filter: {selectedCategory}
              </span>
              <button
                type="button"
                className="category-filter-pill-clear"
                aria-label="Clear category filter"
                data-testid="category-filter-clear"
                onClick={() => setSelectedCategory(null)}
              >
                ×
              </button>
            </div>
          )}
          <TransactionsTable
            transactions={displayedTransactions}
            onCategoryClick={handleCategoryClick}
          />
        </section>
      </main>

      {dropdown && (
        <CategoryDropdown
          anchor={dropdown.anchor}
          categories={config.categories}
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
          initialField={dialog.initialField}
          initialMatch={dialog.initialMatch}
          initialPattern={dialog.initialPattern}
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
