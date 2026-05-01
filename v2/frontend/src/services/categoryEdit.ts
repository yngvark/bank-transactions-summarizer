import type { CategoryNode, CategoryTree, SaveFile, Rule } from '../../../shared/types';

export type Path = number[];
export type NamePath = string[];

export interface AddChildResult {
  tree: CategoryTree;
  path: Path;
}

export interface AddRootResult {
  tree: CategoryTree;
  path: Path;
}

// ---------- Cloning ----------

function cloneNode(n: CategoryNode): CategoryNode {
  return { name: n.name, children: n.children.map(cloneNode) };
}

function cloneTree(tree: CategoryTree): CategoryTree {
  return tree.map(cloneNode);
}

// ---------- Path navigation ----------

export function getNodeAt(tree: CategoryTree, path: Path): CategoryNode {
  if (path.length === 0) {
    throw new Error('getNodeAt: path must not be empty');
  }
  const [head, ...rest] = path;
  const node = tree[head];
  if (!node) {
    throw new Error(`getNodeAt: invalid path index ${head}`);
  }
  if (rest.length === 0) return node;
  return getChildAt(node, rest);
}

function getChildAt(node: CategoryNode, path: Path): CategoryNode {
  let current = node;
  for (const idx of path) {
    const next = current.children[idx];
    if (!next) {
      throw new Error(`getNodeAt: invalid path index ${idx}`);
    }
    current = next;
  }
  return current;
}

// Locate the parent's children array in the cloned tree, plus the final index.
function locateInClone(
  cloned: CategoryTree,
  path: Path,
): { siblings: CategoryNode[]; index: number } {
  if (path.length === 0) {
    throw new Error('locateInClone: path must not be empty');
  }
  if (path.length === 1) {
    return { siblings: cloned, index: path[0] };
  }
  let parent = cloned[path[0]];
  if (!parent) throw new Error(`locateInClone: invalid index ${path[0]}`);
  for (let i = 1; i < path.length - 1; i++) {
    parent = parent.children[path[i]];
    if (!parent) throw new Error(`locateInClone: invalid index ${path[i]}`);
  }
  return { siblings: parent.children, index: path[path.length - 1] };
}

// ---------- Counting ----------

export function countDescendants(node: CategoryNode): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}

// ---------- Mutations ----------

export function renameAt(tree: CategoryTree, path: Path, newName: string): CategoryTree {
  const cloned = cloneTree(tree);
  const { siblings, index } = locateInClone(cloned, path);
  const node = siblings[index];
  if (!node) throw new Error(`renameAt: invalid path index ${index}`);
  if (node.name === newName) {
    return cloned;
  }
  const dup = siblings.some((s, i) => i !== index && s.name === newName);
  if (dup) {
    throw new Error(`renameAt: a sibling named "${newName}" already exists`);
  }
  node.name = newName;
  return cloned;
}

/* eslint-disable no-redeclare */
export function addChildAt(tree: CategoryTree, path: Path, name: string): CategoryTree;
export function addChildAt(
  tree: CategoryTree,
  path: Path,
  name: string,
  options: { withPath: true },
): AddChildResult;
export function addChildAt(
  tree: CategoryTree,
  path: Path,
  name: string,
  options?: { withPath?: boolean },
): CategoryTree | AddChildResult {
  const cloned = cloneTree(tree);
  const parent = getMutableNodeAt(cloned, path);
  if (parent.children.some((c) => c.name === name)) {
    throw new Error(`addChildAt: a child named "${name}" already exists`);
  }
  const newNode: CategoryNode = { name, children: [] };
  parent.children.push(newNode);
  const newPath: Path = [...path, parent.children.length - 1];
  if (options?.withPath) {
    return { tree: cloned, path: newPath };
  }
  return cloned;
}
/* eslint-enable no-redeclare */

export function addRoot(tree: CategoryTree, name: string): AddRootResult {
  const cloned = cloneTree(tree);
  if (cloned.some((n) => n.name === name)) {
    throw new Error(`addRoot: a root named "${name}" already exists`);
  }
  cloned.push({ name, children: [] });
  return { tree: cloned, path: [cloned.length - 1] };
}

export function deleteAt(tree: CategoryTree, path: Path): CategoryTree {
  const cloned = cloneTree(tree);
  const { siblings, index } = locateInClone(cloned, path);
  if (index < 0 || index >= siblings.length) {
    throw new Error(`deleteAt: invalid index ${index}`);
  }
  siblings.splice(index, 1);
  return cloned;
}

export function reorderSiblings(tree: CategoryTree, path: Path, targetIndex: number): CategoryTree {
  const cloned = cloneTree(tree);
  const { siblings, index } = locateInClone(cloned, path);
  if (index < 0 || index >= siblings.length) {
    throw new Error(`reorderSiblings: invalid index ${index}`);
  }
  const clamped = Math.max(0, Math.min(targetIndex, siblings.length - 1));
  if (clamped === index) return cloned;
  const [moved] = siblings.splice(index, 1);
  siblings.splice(clamped, 0, moved);
  return cloned;
}

function getMutableNodeAt(cloned: CategoryTree, path: Path): CategoryNode {
  return getNodeAt(cloned, path);
}

// ---------- Lookups ----------

export function pathOfPrimaryByName(tree: CategoryTree, name: string): Path | null {
  const idx = tree.findIndex((n) => n.name === name);
  return idx === -1 ? null : [idx];
}

export function namePathOf(tree: CategoryTree, path: Path): NamePath {
  const result: NamePath = [];
  if (path.length === 0) return result;
  let node = tree[path[0]];
  if (!node) throw new Error(`namePathOf: invalid path index ${path[0]}`);
  result.push(node.name);
  for (let i = 1; i < path.length; i++) {
    node = node.children[path[i]];
    if (!node) throw new Error(`namePathOf: invalid path index ${path[i]}`);
    result.push(node.name);
  }
  return result;
}

// ---------- Rule rewrites ----------

export function rewriteRulesForRename(
  rules: Rule[],
  oldNamePath: NamePath,
  newName: string,
): Rule[] {
  if (oldNamePath.length === 1) {
    const [oldPrimary] = oldNamePath;
    return rules.map((r) =>
      r.category[0] === oldPrimary ? { ...r, category: [newName, r.category[1]] } : r,
    );
  }
  if (oldNamePath.length === 2) {
    const [oldPrimary, oldSub] = oldNamePath;
    return rules.map((r) =>
      r.category[0] === oldPrimary && r.category[1] === oldSub
        ? { ...r, category: [r.category[0], newName] }
        : r,
    );
  }
  return rules;
}

export function collectAffectedRules(
  rules: Rule[],
  tree: CategoryTree,
  path: Path,
): Rule[] {
  if (path.length === 0 || path.length >= 3) return [];
  const names = namePathOf(tree, path);
  if (names.length === 1) {
    return rules.filter((r) => r.category[0] === names[0]);
  }
  // length === 2
  return rules.filter((r) => r.category[0] === names[0] && r.category[1] === names[1]);
}

// Atomically rename a category in the SaveFile, propagating the new name to
// every structure that references it (the categories tree and rules). All
// callers that rename a category MUST go through this function so the
// structures cannot drift apart.
export function renameCategoryCascade(
  saveFile: SaveFile,
  path: Path,
  newName: string,
): SaveFile {
  const oldNamePath = namePathOf(saveFile.categories, path);
  const newCategories = renameAt(saveFile.categories, path, newName);
  const newRules = rewriteRulesForRename(saveFile.rules, oldNamePath, newName);
  return { ...saveFile, categories: newCategories, rules: newRules };
}
