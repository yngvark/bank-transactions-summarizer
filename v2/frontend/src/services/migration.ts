import type {
  SaveFile,
  CategoryTree,
  CategoryMapping,
  TextPatternRule,
} from '../../../shared/types';
import { validateSaveFile } from '../schemas/savefile';
import categoriesJson from '../data/categories.json';

export const SAVEFILE_STORAGE_KEY = 'bts-savefile-v1';
export const SAVEFILE_BACKUP_KEY = 'bts-savefile-v1.bak';
export const LEGACY_RULES_KEY = 'bts-rules-v1';
export const LEGACY_THEME_KEY = 'theme';

function readLegacyRules(): TextPatternRule[] {
  try {
    const raw = localStorage.getItem(LEGACY_RULES_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TextPatternRule[];
  } catch {
    return [];
  }
}

function readLegacyTheme(): 'light' | 'dark' {
  const raw = localStorage.getItem(LEGACY_THEME_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

function importMerchantMappings(): CategoryMapping {
  const out: CategoryMapping = {};
  const source = categoriesJson as Record<string, string[]>;
  for (const [code, pair] of Object.entries(source)) {
    if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
      out[code] = [pair[0], pair[1]];
    }
  }
  return out;
}

export function deriveCategoryTree(mappings: CategoryMapping): CategoryTree {
  const tree: CategoryTree = {};
  for (const [primary, sub] of Object.values(mappings)) {
    if (!tree[primary]) tree[primary] = { subcategories: [] };
    if (!tree[primary].subcategories.includes(sub)) {
      tree[primary].subcategories.push(sub);
    }
  }
  for (const node of Object.values(tree)) {
    node.subcategories.sort((a, b) => a.localeCompare(b));
  }
  return tree;
}

function buildFreshSaveFile(): SaveFile {
  const merchantCodeMappings = importMerchantMappings();
  return {
    version: 1,
    categories: deriveCategoryTree(merchantCodeMappings),
    rules: {
      merchantCodeMappings,
      textPatternRules: readLegacyRules(),
    },
    settings: {
      theme: readLegacyTheme(),
      density: 'normal',
    },
  };
}

/**
 * Run migration once on app start. If a valid SaveFile already exists in
 * localStorage, returns it unchanged. Otherwise builds one from legacy keys
 * and the static categories.json, persists it, and removes the legacy keys.
 */
export function runMigration(): SaveFile {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw);
      const result = validateSaveFile(parsed);
      if (result.ok) return result.data;
      // Stored SaveFile fails schema validation — preserve the raw blob so
      // it can be recovered from DevTools, then rebuild.
      localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
      console.warn(
        `[bts] Stored SaveFile failed validation (${result.error}). ` +
          `Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
      );
    } catch {
      // Stored SaveFile is unparseable JSON — same recovery path.
      localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
      console.warn(
        `[bts] Stored SaveFile is not valid JSON. ` +
          `Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
      );
    }
  }

  const fresh = buildFreshSaveFile();
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
  localStorage.removeItem(LEGACY_RULES_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  return fresh;
}
