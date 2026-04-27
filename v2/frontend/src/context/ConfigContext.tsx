import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { SaveFile, TextPatternRule, CategoryTree } from '../../../shared/types';
import { loadOrInitSaveFile } from '../services/boot';
import { renameCategoryCascade } from '../services/categoryEdit';
import {
  exportToFile,
  fingerprint,
  importFromFile,
  saveToLocalStorage,
} from '../services/persistence';
import { ConfigContext, ConfigContextValue } from './useConfig';

type MerchantCodeMappings = SaveFile['rules']['merchantCodeMappings'];
type Settings = SaveFile['settings'];

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SaveFile>(() => loadOrInitSaveFile());
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string>(() =>
    fingerprint(config)
  );
  const currentFingerprint = useMemo(() => fingerprint(config), [config]);
  const isDirty = currentFingerprint !== lastSavedFingerprint;

  // Skip the redundant write on first render: loadOrInitSaveFile already wrote
  // localStorage when it built (or accepted) the SaveFile. The auto-save
  // effect only needs to run on subsequent state changes.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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

  const renameCategory = useCallback((path: number[], newName: string) => {
    setConfig((prev) => renameCategoryCascade(prev, path, newName));
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
      renameCategory,
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
      renameCategory,
      isDirty,
      saveToFile,
      loadFromFile,
    ]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
