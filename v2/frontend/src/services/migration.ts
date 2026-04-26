import type {
  SaveFile,
  CategoryTree,
  CategoryNode,
  CategoryMapping,
  TextPatternRule,
} from '../../../shared/types';
import { validateSaveFile } from '../schemas/savefile';
import categoriesJson from '../data/categories.json';

export const SAVEFILE_STORAGE_KEY = 'bts-savefile-v1';
export const SAVEFILE_BACKUP_KEY = 'bts-savefile-v1.bak';
export const LEGACY_RULES_KEY = 'bts-rules-v1';
export const LEGACY_THEME_KEY = 'theme';

type V1CategoryTree = Record<string, { emoji?: string; subcategories: string[] }>;

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
  const byPrimary = new Map<string, Set<string>>();
  for (const [primary, sub] of Object.values(mappings)) {
    if (!byPrimary.has(primary)) byPrimary.set(primary, new Set());
    byPrimary.get(primary)!.add(sub);
  }
  const primaries = Array.from(byPrimary.keys()).sort((a, b) => a.localeCompare(b, 'nb'));
  return primaries.map((name) => ({
    name,
    children: Array.from(byPrimary.get(name)!)
      .sort((a, b) => a.localeCompare(b, 'nb'))
      .map((sub) => ({
        name: sub,
        children: [],
      })),
  }));
}

function migrateV1Categories(v1: V1CategoryTree): CategoryTree {
  const primaries = Object.keys(v1).sort((a, b) => a.localeCompare(b, 'nb'));
  return primaries.map((name) => {
    const node = v1[name];
    const out: CategoryNode = {
      name,
      children: node.subcategories.map((sub) => ({ name: sub, children: [] })),
    };
    if (node.emoji) out.emoji = node.emoji;
    return out;
  });
}

function buildFreshSaveFile(): SaveFile {
  const merchantCodeMappings = importMerchantMappings();
  return {
    version: 2,
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
 * localStorage, returns it unchanged. If a v1 SaveFile is present, upgrades
 * it in place to v2. Otherwise builds one from legacy keys and the static
 * categories.json, persists it, and removes the legacy keys.
 */
export function runMigration(): SaveFile {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw != null) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
      console.warn(
        `[bts] Stored SaveFile is not valid JSON. Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
      );
      const fresh = buildFreshSaveFile();
      localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
      localStorage.removeItem(LEGACY_RULES_KEY);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return fresh;
    }

    // v2 path
    const result = validateSaveFile(parsed);
    if (result.ok) return result.data;

    // v1 → v2 path
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      (parsed as { version?: unknown }).version === 1 &&
      (parsed as { categories?: unknown }).categories &&
      typeof (parsed as { categories: unknown }).categories === 'object' &&
      !Array.isArray((parsed as { categories: unknown }).categories)
    ) {
      try {
        const p = parsed as {
          version: 1;
          categories: V1CategoryTree;
          rules: SaveFile['rules'];
          settings: SaveFile['settings'];
        };
        const upgraded: SaveFile = {
          version: 2,
          categories: migrateV1Categories(p.categories),
          rules: p.rules,
          settings: p.settings,
        };
        const ok = validateSaveFile(upgraded);
        if (ok.ok) {
          localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(ok.data));
          return ok.data;
        }
      } catch {
        // fall through to rebuild below
      }
    }

    // Fallback: backup + rebuild
    localStorage.setItem(SAVEFILE_BACKUP_KEY, raw);
    console.warn(
      `[bts] Stored SaveFile failed validation (${result.error}). ` +
        `Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
    );
  }

  const fresh = buildFreshSaveFile();
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
  localStorage.removeItem(LEGACY_RULES_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  return fresh;
}
