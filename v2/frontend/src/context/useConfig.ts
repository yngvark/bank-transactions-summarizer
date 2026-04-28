import { createContext, useContext } from 'react';
import type { SaveFile, TextPatternRule, CategoryTree } from '../../../shared/types';

type MerchantCodeMappings = SaveFile['rules']['merchantCodeMappings'];
type Settings = SaveFile['settings'];

export interface ConfigContextValue {
  config: SaveFile;
  updateRules: (next: TextPatternRule[]) => void;
  updateCategories: (next: CategoryTree) => void;
  updateMerchantMappings: (next: MerchantCodeMappings) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  // Atomic rename. Use this instead of updateCategories+updateRules+
  // updateMerchantMappings, or the three structures may desync.
  renameCategory: (path: number[], newName: string) => void;
  isDirty: boolean;
  exportToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (ctx == null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return ctx;
}
