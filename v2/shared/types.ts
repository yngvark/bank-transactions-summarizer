// Raw transaction from Excel file
export interface RawTransaction {
  TransactionDate: Date | string | null;
  BookDate: Date | string | null;
  ValueDate: Date | string | null;
  Text: string;
  Type: string;
  'Currency Amount': number;
  'Currency Rate': number;
  Currency: string;
  Amount: number;
  'Merchant Area': string;
  'Merchant Category': string;
}

// Transaction with category applied. Dates may be null for pending ("Reservert") rows.
export interface Transaction extends RawTransaction {
  TransactionDate: Date | null;
  BookDate: Date | null;
  ValueDate: Date | null;
  Category: string;
}

// User-defined rule for assigning a category to transactions. Rules are
// evaluated in array order; the first match wins. `field` selects which
// transaction column to match against, `match` selects the comparison.
export type RuleField = 'text' | 'merchantCategory';
export type MatchKind = 'substring' | 'regex' | 'exact';

export interface Rule {
  id: string;
  field: RuleField;
  match: MatchKind;
  pattern: string;
  category: [string, string]; // [primary, sub]
}

// Recursive category node. Children are ordered (rendering and persistence
// preserve sibling order).
export interface CategoryNode {
  name: string;
  children: CategoryNode[];
}

// Ordered list of root-level category nodes.
export type CategoryTree = CategoryNode[];

// Unified user state persisted to localStorage and exportable as a JSON file.
export interface SaveFile {
  version: 3;
  categories: CategoryTree;
  rules: Rule[];
  settings: {
    theme: 'light' | 'dark';
    density: string;
  };
}

// Raw row data for statistics
export interface RawRowData {
  category: string;
  periodTotals: number[];
  average: number;
  sum: number;
}

// Node in the category tree for hierarchical display
export interface CategoryTreeNode {
  name: string;
  path: string;
  depth: number;
  periodTotals: number[];
  average: number;
  sum: number;
  children: CategoryTreeNode[];
}

// Grouped statistics data
export interface GroupedStatistics {
  header: string[];
  tableData: string[][];
  footer: string[];
  rawTableData: RawRowData[];
  yearMonths: string[];
  categoryTree: CategoryTreeNode[];
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
