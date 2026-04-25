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
  isDirty: boolean;
  saveToFile: () => void;
  loadFromFile: (file: File) => Promise<void>;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (ctx == null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return ctx;
}
