// Raw transaction from Excel file
export interface RawTransaction {
  TransactionDate: Date | string;
  BookDate: Date | string;
  ValueDate: Date | string;
  Text: string;
  Type: string;
  'Currency Amount': number;
  'Currency Rate': number;
  Currency: string;
  Amount: number;
  'Merchant Area': string;
  'Merchant Category': string;
}

// Transaction with category applied
export interface Transaction extends RawTransaction {
  TransactionDate: Date;
  BookDate: Date;
  ValueDate: Date;
  Category: string;
}

// Category mapping from merchant category to hierarchical category path
export type CategoryMapping = Record<string, string[]>;

// Raw row data for statistics
export interface RawRowData {
  category: string;
  periodTotals: number[];
  average: number;
  sum: number;
}

// Grouped statistics data
export interface GroupedStatistics {
  header: string[];
  tableData: string[][];
  footer: string[];
  rawTableData: RawRowData[];
  yearMonths: string[];
}

// Color configuration
export interface ColorConfig {
  MAX_RED_RATIO: number;
  MAX_GREEN_RATIO: number;
  MAX_RED_COLOR: string;
  MAX_GREEN_COLOR: string;
  NEUTRAL_COLOR: string;
}

// API response types
export interface ListFilesResponse {
  hasDataDir: boolean;
  dataDir?: string;
  files: string[];
}

export interface CheckFileResponse {
  hasDataDir: boolean;
  hasDefaultFile: boolean;
  dataDir?: string;
}
