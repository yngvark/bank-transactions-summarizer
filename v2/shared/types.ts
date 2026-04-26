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

// Category mapping from merchant category to a [primary, sub] hierarchical
// category path. Same shape as SaveFile.rules.merchantCodeMappings.
export type CategoryMapping = Record<string, [string, string]>;

// User-defined text-pattern rule that overrides merchant-code categorization.
// Rules are evaluated in array order; the first match wins.
export type RuleType = 'substring' | 'regex';

export interface TextPatternRule {
  id: string;
  type: RuleType;
  pattern: string;
  category: [string, string]; // [primary, sub]
}

// Recursive category node. Top-level nodes typically carry an emoji;
// deeper nodes do not. Children are ordered (rendering and persistence
// preserve sibling order).
export interface CategoryNode {
  name: string;
  emoji?: string;
  children: CategoryNode[];
}

// Ordered list of root-level category nodes.
export type CategoryTree = CategoryNode[];

// Unified user state persisted to localStorage and exportable as a JSON file.
export interface SaveFile {
  version: 2;
  categories: CategoryTree;
  rules: {
    merchantCodeMappings: Record<string, [string, string]>;
    textPatternRules: TextPatternRule[];
  };
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
