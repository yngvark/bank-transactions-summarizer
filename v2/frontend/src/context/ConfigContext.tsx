import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import type { SaveFile, TextPatternRule, CategoryTree } from '../../../shared/types';
import { runMigration } from '../services/migration';
import {
  exportToFile,
  fingerprint,
  importFromFile,
  saveToLocalStorage,
} from '../services/persistence';

type MerchantCodeMappings = SaveFile['rules']['merchantCodeMappings'];
type Settings = SaveFile['settings'];

interface ConfigContextValue {
  config: SaveFile;
  updateRules: (next: TextPatternRule[]) => void;
  updateCategories: (next: CategoryTree) => void;
  updateMerchantMappings: (next: MerchantCodeMappings) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  isDirty: boolean;
  saveToFile: () => void;
  loadFromFile: (file: File) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SaveFile>(() => runMigration());
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string>(() =>
    fingerprint(config)
  );
  const currentFingerprint = useMemo(() => fingerprint(config), [config]);
  const isDirty = currentFingerprint !== lastSavedFingerprint;

  // Auto-save to localStorage whenever config changes.
  useEffect(() => {
    saveToLocalStorage(config);
  }, [config]);

  // Warn the user when navigating away with unsaved file changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateRules = useCallback((next: TextPatternRule[]) => {
    setConfig((prev) => ({ ...prev, rules: { ...prev.rules, textPatternRules: next } }));
  }, []);

  const updateCategories = useCallback((next: CategoryTree) => {
    setConfig((prev) => ({ ...prev, categories: next }));
  }, []);

  const updateMerchantMappings = useCallback((next: MerchantCodeMappings) => {
    setConfig((prev) => ({ ...prev, rules: { ...prev.rules, merchantCodeMappings: next } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setConfig((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const saveToFile = useCallback(() => {
    exportToFile(config);
    setLastSavedFingerprint(fingerprint(config));
  }, [config]);

  const loadFromFile = useCallback(async (file: File) => {
    const loaded = await importFromFile(file);
    setConfig(loaded);
    setLastSavedFingerprint(fingerprint(loaded));
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      updateRules,
      updateCategories,
      updateMerchantMappings,
      updateSettings,
      isDirty,
      saveToFile,
      loadFromFile,
    }),
    [
      config,
      updateRules,
      updateCategories,
      updateMerchantMappings,
      updateSettings,
      isDirty,
      saveToFile,
      loadFromFile,
    ]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (ctx == null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return ctx;
}
