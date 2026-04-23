import * as d3 from 'd3';
import { Transaction, GroupedStatistics, RawRowData } from '../../../shared/types';
import { buildCategoryTree } from './categoryTree';

export function calculateStatistics(transactionsWithCategory: Transaction[]): GroupedStatistics {
  // Pending ("Reservert") rows have no TransactionDate — exclude them from aggregation.
  const dated = transactionsWithCategory.filter(
    (t): t is Transaction & { TransactionDate: Date } => t.TransactionDate != null
  );
  const groupedData = groupData(dated);

  const yearMonths = Array.from(groupedData.keys()).sort();
  const categories = Array.from(new Set(dated.map((d) => d.Category))).sort();

  const numberFormatter = new Intl.NumberFormat('nb-NO', {
    style: 'decimal',
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const rawTableData: RawRowData[] = [];
  const tableData = categories.map((category) => {
    const periodTotals = yearMonths.map(
      (yearMonth) => Math.round(groupedData.get(yearMonth)?.get(category) ?? 0)
    );

    const average = periodTotals.reduce((a, b) => a + b, 0) / periodTotals.length;
    const formattedAverage = numberFormatter.format(average);

    const sum = periodTotals.reduce((a, b) => (a * 100 + b * 100) / 100);

    const formattedPeriodTotals = periodTotals.map((value) => numberFormatter.format(value));
    const formattedSum = numberFormatter.format(sum);

    rawTableData.push({
      category,
      periodTotals,
      average,
      sum,
    });

    return [category, ...formattedPeriodTotals, formattedSum, formattedAverage];
  });

  const header = ['Category', ...yearMonths, 'Sum', 'Average'];

  const footerData = yearMonths.map((yearMonth) => {
    return categories.reduce((a, b) => {
      return Math.round(a + (groupedData.get(yearMonth)?.get(b) ?? 0));
    }, 0);
  });

  const formattedFooterData = footerData.map((value) => numberFormatter.format(value));
  const sumOfSums = footerData.reduce((a, b) => a + b, 0);
  const formattedSumOfSums = numberFormatter.format(sumOfSums);
  const averageOfAverages = footerData.reduce((a, b) => a + b, 0) / footerData.length;
  const formattedAverageOfAverages = numberFormatter.format(averageOfAverages);

  const footer = ['Sum', ...formattedFooterData, formattedSumOfSums, formattedAverageOfAverages];

  const categoryTree = buildCategoryTree(rawTableData, yearMonths);

  return {
    header,
    tableData,
    footer,
    rawTableData,
    yearMonths,
    categoryTree,
  };
}

function groupData(
  parsedData: Array<Transaction & { TransactionDate: Date }>
): d3.InternMap<string, d3.InternMap<string, number>> {
  return d3.rollup(
    parsedData,
    (v) => d3.sum(v, (d) => d.Amount),
    (d) => getDateKey(d.TransactionDate),
    (d) => d.Category
  );
}

function getDateKey(date: Date): string {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1);
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
