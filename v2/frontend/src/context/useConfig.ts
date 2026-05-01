import { createContext, useContext } from 'react';
import type { SaveFile, Rule, CategoryTree } from '../../../shared/types';

type Settings = SaveFile['settings'];

export interface ConfigContextValue {
  config: SaveFile;
  updateRules: (next: Rule[]) => void;
  updateCategories: (next: CategoryTree) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  // Atomic rename. Use this instead of updateCategories+updateRules,
  // or the structures may desync.
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
