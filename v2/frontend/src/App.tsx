import { useState, useEffect, useCallback } from 'react';
import { RawTransaction, Transaction, GroupedStatistics, CategoryMapping } from '../../shared/types';
import FileUpload from './components/FileUpload';
import SearchControls from './components/SearchControls';
import StatisticsTable from './components/StatisticsTable';
import TransactionsTable from './components/TransactionsTable';
import DisplaySettings, { applyDisplaySettings } from './components/DisplaySettings';
import { parseTransactions } from './services/parser';
import { calculateStatistics } from './services/statistics';
import { generateRandomTransactions } from './utils/randomize';
import categoriesJson from './data/categories.json';

const categoryMapping = categoriesJson as unknown as CategoryMapping;

function App() {
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<GroupedStatistics | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('No file loaded');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [density, setDensity] = useState('normal');

  // Apply display settings when they change
  useEffect(() => {
    applyDisplaySettings(density);
  }, [density]);

  // Process transactions when data or filters change
  const processTransactions = useCallback(async () => {
    if (!categoryMapping || allTransactions.length === 0) return;

    // Apply filters
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

    const transactionsWithCategory = parseTransactions(categoryMapping, filtered);
    const stats = calculateStatistics(transactionsWithCategory);

    setFilteredTransactions(transactionsWithCategory);
    setStatistics(stats);
  }, [allTransactions, searchTerm, periodFrom, periodTo]);

  // Reprocess when dependencies change
  useEffect(() => {
    processTransactions();
  }, [processTransactions]);

  // Set initial date range when transactions load
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
            <DisplaySettings
              density={density}
              onDensityChange={setDensity}
            />
          </section>
        )}

        <section className="transactions-section">
          <h2>Transactions {filteredTransactions.length > 0 && <span className="count">({filteredTransactions.length})</span>}</h2>
          <TransactionsTable transactions={filteredTransactions} />
        </section>
      </main>
    </div>
  );
}

export default App;
