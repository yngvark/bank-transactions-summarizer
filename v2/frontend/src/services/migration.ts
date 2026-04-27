import type {
  SaveFile,
  CategoryTree,
  CategoryMapping,
  TextPatternRule,
} from '../../../shared/types';
import { validateSaveFile, V1SaveFileSchema } from '../schemas/savefile';
import type { V1SaveFile } from '../schemas/savefile';
import categoriesJson from '../data/categories.json';

// The "-v1" suffix is the localStorage slot name, not the payload version
// (which lives inside the payload as `version: number`).
export const SAVEFILE_STORAGE_KEY = 'bts-savefile-v1';
export const SAVEFILE_BACKUP_KEY = 'bts-savefile-v1.bak';
export const LEGACY_RULES_KEY = 'bts-rules-v1';
export const LEGACY_THEME_KEY = 'theme';

type V1CategoryTree = V1SaveFile['categories'];

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

function mergeEmojiIntoName(emoji: string | undefined, name: string): string {
  return emoji ? `${emoji} ${name}` : name;
}

function migrateV1Categories(v1: V1CategoryTree): CategoryTree {
  const primaries = Object.keys(v1).sort((a, b) => a.localeCompare(b, 'nb'));
  return primaries.map((name) => {
    const node = v1[name];
    return {
      name: mergeEmojiIntoName(node.emoji, name),
      children: node.subcategories.map((sub) => ({ name: sub, children: [] })),
    };
  });
}

// Strip a legacy `emoji` field from any category node and merge it into the
// node's name (e.g. `{ name: "Mat", emoji: "🍔" }` → `{ name: "🍔 Mat" }`).
// Idempotent: nodes without `emoji` pass through unchanged.
function stripCategoryEmoji(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.categories)) return input;
  function walk(node: unknown): unknown {
    if (!node || typeof node !== 'object') return node;
    const n = node as Record<string, unknown>;
    const { emoji, name, children, ...rest } = n;
    const mergedName =
      typeof emoji === 'string' && emoji.length > 0 && typeof name === 'string'
        ? `${emoji} ${name}`
        : name;
    return {
      ...rest,
      name: mergedName,
      children: Array.isArray(children) ? children.map(walk) : children,
    };
  }
  return { ...obj, categories: obj.categories.map(walk) };
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

function tryUpgradeV1(parsed: unknown): SaveFile | null {
  const v1 = V1SaveFileSchema.safeParse(parsed);
  if (!v1.success) return null;
  const upgraded: SaveFile = {
    version: 2,
    categories: migrateV1Categories(v1.data.categories),
    rules: v1.data.rules,
    settings: v1.data.settings,
  };
  const ok = validateSaveFile(upgraded);
  if (!ok.ok) return null;
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(ok.data));
  return ok.data;
}

function writeFresh(): SaveFile {
  const fresh = buildFreshSaveFile();
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
  localStorage.removeItem(LEGACY_RULES_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
  return fresh;
}

function backupAndRebuild(rawBlob: string, reason: string): SaveFile {
  localStorage.setItem(SAVEFILE_BACKUP_KEY, rawBlob);
  console.warn(
    `[bts] Stored SaveFile failed (${reason}). ` +
      `Original copied to "${SAVEFILE_BACKUP_KEY}"; rebuilding from defaults.`
  );
  return writeFresh();
}

/**
 * Run migration once on app start. If a valid SaveFile already exists in
 * localStorage, returns it unchanged. If a v1 SaveFile is present, upgrades
 * it in place to v2. Otherwise builds one from legacy keys and the static
 * categories.json, persists it, and removes the legacy keys.
 */
export function runMigration(): SaveFile {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw == null) return writeFresh();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return backupAndRebuild(raw, 'invalid JSON');
  }

  const v2 = validateSaveFile(parsed);
  if (v2.ok) return v2.data;

  // Older v2 SaveFiles carried an `emoji` field on category nodes; the field
  // has since been removed in favor of putting the emoji directly in the name.
  // Strip it and re-validate before treating the file as broken.
  const stripped = validateSaveFile(stripCategoryEmoji(parsed));
  if (stripped.ok) {
    localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(stripped.data));
    return stripped.data;
  }

  const v1 = tryUpgradeV1(parsed);
  if (v1) return v1;

  return backupAndRebuild(raw, v2.error);
}
