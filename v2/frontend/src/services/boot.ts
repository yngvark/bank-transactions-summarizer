import type {
  SaveFile,
  CategoryTree,
  CategoryNode,
  Rule,
} from '../../../shared/types';
import { validateSaveFile } from '../schemas/savefile';
import categoriesJson from '../data/categories.json';

// The "-v1" suffix is the localStorage slot name, not the payload version
// (which lives inside the payload as `version: number`).
export const SAVEFILE_STORAGE_KEY = 'bts-savefile-v1';
export const SAVEFILE_BACKUP_KEY = 'bts-savefile-v1.bak';

function importSeededRules(): Rule[] {
  const source = categoriesJson as Record<string, string[]>;
  const rules: Rule[] = [];
  for (const [code, pair] of Object.entries(source)) {
    if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
      rules.push({
        id: `seed-${code}`,
        field: 'merchantCategory',
        match: 'exact',
        pattern: code,
        category: [pair[0], pair[1]],
      });
    }
  }
  return rules;
}

export function deriveCategoryTree(rules: Rule[]): CategoryTree {
  const byPrimary = new Map<string, Set<string>>();
  for (const r of rules) {
    const [primary, sub] = r.category;
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

// Append any (primary, sub) pair referenced in `rules` but missing from
// `tree`. Categories the user added that have no rule are preserved
// untouched; only missing nodes are added (never renamed or removed). Returns
// the same tree reference when nothing was missing, so callers can detect a
// no-op via identity comparison.
function reconcileCategoriesWithRules(
  tree: CategoryTree,
  rules: Rule[],
): CategoryTree {
  const required = new Map<string, Set<string>>();
  for (const r of rules) {
    const [primary, sub] = r.category;
    if (!required.has(primary)) required.set(primary, new Set());
    required.get(primary)!.add(sub);
  }
  const present = new Map<string, Set<string>>();
  for (const node of tree) {
    present.set(node.name, new Set(node.children.map((c) => c.name)));
  }
  let changed = false;
  for (const [primary, subs] of required) {
    if (!present.has(primary)) { changed = true; break; }
    const have = present.get(primary)!;
    for (const sub of subs) {
      if (!have.has(sub)) { changed = true; break; }
    }
    if (changed) break;
  }
  if (!changed) return tree;
  const next: CategoryNode[] = tree.map((n) => ({ ...n, children: [...n.children] }));
  for (const [primary, subs] of required) {
    let node = next.find((n) => n.name === primary);
    if (!node) {
      node = { name: primary, children: [] };
      next.push(node);
    }
    const have = new Set(node.children.map((c) => c.name));
    for (const sub of subs) {
      if (!have.has(sub)) node.children.push({ name: sub, children: [] });
    }
  }
  return next;
}

function buildFreshSaveFile(): SaveFile {
  const seededRules = importSeededRules();
  return {
    version: 3,
    categories: deriveCategoryTree(seededRules),
    rules: seededRules,
    settings: {
      theme: 'light',
      density: 'normal',
    },
  };
}

function writeFresh(): SaveFile {
  const fresh = buildFreshSaveFile();
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(fresh));
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

// Heal a SaveFile whose categories tree has drifted from its rules (a
// primary or sub appears in rules but not in the tree). Persists the healed
// SaveFile when anything actually changed.
function healAndPersist(sf: SaveFile): SaveFile {
  const healed = reconcileCategoriesWithRules(sf.categories, sf.rules);
  if (healed === sf.categories) return sf;
  const next: SaveFile = { ...sf, categories: healed };
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Load the SaveFile from localStorage on app boot, or build and persist a
 * fresh one from defaults if none exists. A stored SaveFile that fails JSON
 * parse or schema validation is backed up under SAVEFILE_BACKUP_KEY and
 * replaced with a fresh build.
 */
export function loadOrInitSaveFile(): SaveFile {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw == null) return writeFresh();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return backupAndRebuild(raw, 'invalid JSON');
  }

  const v = validateSaveFile(parsed);
  if (v.ok) return healAndPersist(v.data);

  return backupAndRebuild(raw, v.error);
}
