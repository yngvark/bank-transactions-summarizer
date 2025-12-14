import { useState, useEffect, useCallback } from 'react';
import { RawTransaction, Transaction, CategoryMapping, GroupedStatistics } from '../../shared/types';
import FileUpload from './components/FileUpload';
import SearchControls from './components/SearchControls';
import StatisticsTable from './components/StatisticsTable';
import TransactionsTable from './components/TransactionsTable';
import { parseTransactions } from './services/parser';
import { calculateStatistics } from './services/statistics';
import { generateRandomTransactions } from './utils/randomize';

function App() {
  const [categoryMapping, setCategoryMapping] = useState<CategoryMapping | null>(null);
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<GroupedStatistics | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('No file loaded');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Load category mapping on mount
  useEffect(() => {
    fetch('/categories')
      .then((res) => res.json())
      .then((data) => setCategoryMapping(data))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Check and load default file on mount
  useEffect(() => {
    async function checkAndLoadDefaultFile() {
      try {
        const response = await fetch('/files/check');
        const result = await response.json();

        if (result.hasDataDir && result.hasDefaultFile) {
          console.log('Loading default transactions.xlsx from DATA_DIR');
          const fileResponse = await fetch('/files/default');
          if (!fileResponse.ok) throw new Error('Failed to load default file');

          const arrayBuffer = await fileResponse.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);

          // Import xlsx dynamically
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const transactions = XLSX.utils.sheet_to_json<RawTransaction>(worksheet);

          setAllTransactions(transactions);
          setCurrentFileName('transactions.xlsx');
        }
      } catch (error) {
        console.log('No default file available or error checking:', error);
      }
    }

    checkAndLoadDefaultFile();
  }, []);

  // Process transactions when data or filters change
  const processTransactions = useCallback(async () => {
    if (!categoryMapping || allTransactions.length === 0) return;

    // Apply filters
    let filtered = allTransactions.filter((row) =>
      row.Text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (periodFrom) {
      filtered = filtered.filter(
        (row) => new Date(row.BookDate) >= new Date(periodFrom)
      );
    }

    if (periodTo) {
      filtered = filtered.filter(
        (row) => new Date(row.BookDate) <= new Date(periodTo)
      );
    }

    const transactionsWithCategory = parseTransactions(categoryMapping, filtered);
    const stats = calculateStatistics(transactionsWithCategory);

    setFilteredTransactions(transactionsWithCategory);
    setStatistics(stats);
  }, [categoryMapping, allTransactions, searchTerm, periodFrom, periodTo]);

  // Reprocess when dependencies change
  useEffect(() => {
    processTransactions();
  }, [processTransactions]);

  // Set initial date range when transactions load
  useEffect(() => {
    if (allTransactions.length === 0) return;

    const parsedTransactions = allTransactions
      .map((d) => ({
        ...d,
        TransactionDateParsed: new Date(d.TransactionDate),
      }))
      .sort((a, b) => a.TransactionDateParsed.getTime() - b.TransactionDateParsed.getTime());

    if (parsedTransactions.length === 0) return;

    const latestTransaction = parsedTransactions[parsedTransactions.length - 1];
    const year = latestTransaction.TransactionDateParsed.getFullYear();
    const yearStart = `${year}-01-01`;

    const latestDate = latestTransaction.TransactionDateParsed;
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

  const handleUseAi = async () => {
    try {
      const response = await fetch('/ai');
      const data = await response.json();
      console.log('AI Response:', data);
    } catch (error) {
      console.error('AI Error:', error);
    }
  };

  return (
    <div className="app">
      <FileUpload currentFileName={currentFileName} onFileLoad={handleFileLoad} />

      <SearchControls
        searchTerm={searchTerm}
        periodFrom={periodFrom}
        periodTo={periodTo}
        onSearchChange={setSearchTerm}
        onPeriodFromChange={setPeriodFrom}
        onPeriodToChange={setPeriodTo}
        onRandomize={handleRandomize}
        onUseAi={handleUseAi}
      />

      {statistics && <StatisticsTable statistics={statistics} />}

      <TransactionsTable transactions={filteredTransactions} />
    </div>
  );
}

export default App;
