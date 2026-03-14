import { RawRowData, CategoryTreeNode } from '../../../shared/types';

export function buildCategoryTree(rawTableData: RawRowData[], yearMonths: string[]): CategoryTreeNode[] {
  const periodCount = yearMonths.length;

  // Map to hold top-level nodes by name
  const rootMap = new Map<string, CategoryTreeNode>();

  for (const row of rawTableData) {
    const segments = row.category.split(' \u27A1 ');
    let currentMap = rootMap;
    let parentChildren: CategoryTreeNode[] | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = segments.slice(0, i + 1).join('/');
      const isLeaf = i === segments.length - 1;

      let node = currentMap.get(segment);
      if (!node) {
        node = {
          name: segment,
          path,
          depth: i,
          periodTotals: new Array(periodCount).fill(0),
          average: 0,
          sum: 0,
          children: [],
        };
        currentMap.set(segment, node);
        if (parentChildren) {
          parentChildren.push(node);
        }
      }

      if (isLeaf) {
        // Assign leaf data
        node.periodTotals = row.periodTotals;
        node.average = row.average;
        node.sum = row.sum;
      }

      parentChildren = node.children;
      // Build child map for next level
      const childMap = new Map<string, CategoryTreeNode>();
      for (const child of node.children) {
        childMap.set(child.name, child);
      }
      currentMap = childMap;
    }
  }

  const roots = Array.from(rootMap.values());

  // Sort children alphabetically and compute parent aggregates bottom-up
  function finalize(nodes: CategoryTreeNode[]): void {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      if (node.children.length > 0) {
        finalize(node.children);
        // Parent totals = sum of children
        for (let i = 0; i < periodCount; i++) {
          node.periodTotals[i] = node.children.reduce((s, c) => s + c.periodTotals[i], 0);
        }
        node.sum = node.periodTotals.reduce((a, b) => a + b, 0);
        node.average = periodCount > 0 ? node.sum / periodCount : 0;
      }
    }
  }

  finalize(roots);
  return roots;
}
