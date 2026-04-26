import { useState, useMemo, useCallback, useEffect } from 'react';
import { GroupedStatistics, ColorConfig, CategoryTreeNode } from '../../../shared/types';
import { useConfig } from '../context/useConfig';
import type { CategoryTree, CategoryNode } from '../../../shared/types';

interface StatisticsTableProps {
  statistics: GroupedStatistics;
}

const LIGHT_COLOR_CONFIG: ColorConfig = {
  MAX_RED_RATIO: 2.0,
  MAX_GREEN_RATIO: 0.5,
  MAX_RED_COLOR: '#fca5a5',    // Soft coral red
  MAX_GREEN_COLOR: '#86efac',  // Soft mint green
  NEUTRAL_COLOR: '#ffffff',
};

const DARK_COLOR_CONFIG: ColorConfig = {
  MAX_RED_RATIO: 2.0,
  MAX_GREEN_RATIO: 0.5,
  MAX_RED_COLOR: '#7f1d1d',    // Dark red
  MAX_GREEN_COLOR: '#14532d',  // Dark green
  NEUTRAL_COLOR: '#1e1e2e',    // Dark surface
};

function calculateCellColor(cellValue: number, average: number, isDark: boolean): string {
  const COLOR_CONFIG = isDark ? DARK_COLOR_CONFIG : LIGHT_COLOR_CONFIG;
  if (average === 0) return COLOR_CONFIG.NEUTRAL_COLOR;

  const ratio = cellValue / average;

  if (ratio >= COLOR_CONFIG.MAX_RED_RATIO) {
    return COLOR_CONFIG.MAX_RED_COLOR;
  } else if (ratio <= COLOR_CONFIG.MAX_GREEN_RATIO) {
    return COLOR_CONFIG.MAX_GREEN_COLOR;
  } else if (ratio > 1) {
    const intensity = (ratio - 1) / (COLOR_CONFIG.MAX_RED_RATIO - 1);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_RED_COLOR, intensity);
  } else {
    const intensity = (1 - ratio) / (1 - COLOR_CONFIG.MAX_GREEN_RATIO);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_GREEN_COLOR, intensity);
  }
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const numberFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'decimal',
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatNum(n: number): string {
  return numberFormatter.format(n);
}

interface VisibleRow {
  node: CategoryTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  indexPath: number[];
}

function collectVisibleRows(
  nodes: CategoryTreeNode[],
  depth: number,
  expandState: Record<string, boolean>,
  parentPath: number[] = []
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const indexPath = [...parentPath, i];
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && !!expandState[node.path];
    rows.push({ node, depth, hasChildren, isExpanded, indexPath });
    if (isExpanded) {
      rows.push(...collectVisibleRows(node.children, depth + 1, expandState, indexPath));
    }
  }
  return rows;
}

function buildEditTreeNodes(
  configTree: CategoryTree,
  amountsByPath: Map<string, { periodTotals: number[]; sum: number; average: number }>
): CategoryTreeNode[] {
  function walk(nodes: CategoryNode[], parentPath: string[]): CategoryTreeNode[] {
    return nodes.map((n) => {
      const segments = [...parentPath, n.name];
      const path = segments.join('/');
      const amounts = amountsByPath.get(segments.join(' ➡ '));
      const children = walk(n.children, segments);
      const periodTotals = amounts
        ? amounts.periodTotals
        : children.length > 0
          ? children[0].periodTotals.map((_, i) =>
              children.reduce((s, c) => s + c.periodTotals[i], 0)
            )
          : [];
      const sum = amounts ? amounts.sum : periodTotals.reduce((a, b) => a + b, 0);
      const periodCount = periodTotals.length;
      const average = amounts ? amounts.average : periodCount > 0 ? sum / periodCount : 0;
      return {
        name: n.name,
        path,
        depth: parentPath.length,
        periodTotals,
        sum,
        average,
        children,
      };
    });
  }
  return walk(configTree, []);
}

function flattenAmountsByJoinedName(stats: GroupedStatistics): Map<string, { periodTotals: number[]; sum: number; average: number }> {
  const map = new Map<string, { periodTotals: number[]; sum: number; average: number }>();
  for (const row of stats.rawTableData) {
    map.set(row.category, {
      periodTotals: row.periodTotals,
      sum: row.sum,
      average: row.average,
    });
  }
  return map;
}

function StatisticsTable({ statistics }: StatisticsTableProps) {
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const { categoryTree, yearMonths, footer } = statistics;
  const { config } = useConfig();
  const [editing, setEditing] = useState(false);
  const [savedExpand, setSavedExpand] = useState<Record<string, boolean> | null>(null);

  const editTree = useMemo(() => {
    const amounts = flattenAmountsByJoinedName(statistics);
    return buildEditTreeNodes(config.categories, amounts);
  }, [statistics, config.categories]);

  const treeForRender = editing ? editTree : categoryTree;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const toggleNode = useCallback((path: string) => {
    setExpandState(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const expandAll = useCallback(() => {
    const state: Record<string, boolean> = {};
    function walk(nodes: CategoryTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          state[node.path] = true;
          walk(node.children);
        }
      }
    }
    walk(treeForRender);
    setExpandState(state);
  }, [treeForRender]);

  const collapseAll = useCallback(() => {
    setExpandState({});
  }, []);

  const expandOneLevel = useCallback(() => {
    setExpandState(prev => {
      const next = { ...prev };
      let minDepth = Infinity;
      function findMin(nodes: CategoryTreeNode[], depth: number) {
        for (const node of nodes) {
          if (node.children.length > 0) {
            if (!next[node.path]) {
              if (depth < minDepth) minDepth = depth;
            } else {
              findMin(node.children, depth + 1);
            }
          }
        }
      }
      findMin(treeForRender, 0);
      if (minDepth === Infinity) return prev;

      function expandAtDepth(nodes: CategoryTreeNode[], depth: number) {
        for (const node of nodes) {
          if (node.children.length > 0) {
            if (!next[node.path] && depth === minDepth) {
              next[node.path] = true;
            } else if (next[node.path]) {
              expandAtDepth(node.children, depth + 1);
            }
          }
        }
      }
      expandAtDepth(treeForRender, 0);
      return next;
    });
  }, [treeForRender]);

  const collapseOneLevel = useCallback(() => {
    setExpandState(prev => {
      const next = { ...prev };
      let maxDepth = -1;
      function findMax(nodes: CategoryTreeNode[], depth: number) {
        for (const node of nodes) {
          if (node.children.length > 0 && next[node.path]) {
            const hasExpandedChild = node.children.some(c => c.children.length > 0 && next[c.path]);
            if (!hasExpandedChild) {
              if (depth > maxDepth) maxDepth = depth;
            } else {
              findMax(node.children, depth + 1);
            }
          }
        }
      }
      findMax(treeForRender, 0);
      if (maxDepth === -1) return prev;

      function collapseAtDepth(nodes: CategoryTreeNode[], depth: number) {
        for (const node of nodes) {
          if (node.children.length > 0 && next[node.path]) {
            if (depth === maxDepth) {
              next[node.path] = false;
            } else {
              collapseAtDepth(node.children, depth + 1);
            }
          }
        }
      }
      collapseAtDepth(treeForRender, 0);
      return next;
    });
  }, [treeForRender]);

  const visibleRows = useMemo(
    () => collectVisibleRows(treeForRender, 0, expandState),
    [treeForRender, expandState]
  );

  useEffect(() => {
    if (editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedExpand(expandState);
      const all: Record<string, boolean> = {};
      function walk(nodes: CategoryTreeNode[]) {
        for (const n of nodes) {
          if (n.children.length > 0) {
            all[n.path] = true;
            walk(n.children);
          }
        }
      }
      walk(treeForRender);
      setExpandState(all);
    } else if (savedExpand != null) {
      setExpandState(savedExpand);
      setSavedExpand(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.cat-name-input')) {
        setEditing(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editing]);

  return (
    <>
      <div className="statistics-controls-bar">
        <div className="control-group">
          <button onClick={collapseOneLevel}>Collapse</button>
          <button onClick={expandOneLevel}>Expand</button>
        </div>
        <div className="control-group">
          <button onClick={collapseAll}>Collapse All</button>
          <button onClick={expandAll}>Expand All</button>
        </div>
        <button
          className={heatmapEnabled ? 'active' : ''}
          onClick={() => setHeatmapEnabled(prev => !prev)}
        >
          Heatmap
        </button>
        <button
          type="button"
          className={`edit-toggle${editing ? ' active' : ''}`}
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
          data-testid="cat-edit-toggle"
        >
          <span className="switch-pill" />
          <span>{editing ? '✏️ Editing' : '✏️ Edit categories'}</span>
        </button>
      </div>
      {editing && (
        <div className="cat-edit-hint" role="status">
          Edit mode active. Click a name to rename · Hover a row for <strong>+</strong> (add child) and <strong>×</strong> (delete) · Drag <span className="drag-glyph">⋮⋮</span> to reorder within siblings · <kbd>Esc</kbd> exits
        </div>
      )}
      <div className={`table-wrapper${editing ? ' editing' : ''}`}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              {yearMonths.map(ym => (
                <th key={ym}>{ym}</th>
              ))}
              <th>Sum</th>
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ node, depth, hasChildren, isExpanded, indexPath }) => (
              <tr key={node.path} className={`depth-${Math.min(depth, 3)}`} data-path={indexPath.join('.')}>
                <td
                  className={hasChildren ? 'cat-cell-parent' : undefined}
                  onClick={hasChildren ? () => toggleNode(node.path) : undefined}
                >
                  <div className="cat-content">
                    <span className="indent" style={{ width: depth * 16 }} />
                    {hasChildren ? (
                      <span className={`chevron${isExpanded ? ' open' : ''}`}>{'\u25B6'}</span>
                    ) : (
                      <span className="no-chevron" />
                    )}
                    <span>{node.name}</span>
                  </div>
                </td>
                {node.periodTotals.map((val, i) => (
                  <td
                    key={i}
                    className="num-cell"
                    style={
                      heatmapEnabled
                        ? { backgroundColor: calculateCellColor(val, node.average, theme === 'dark') }
                        : undefined
                    }
                  >
                    {formatNum(val)}
                  </td>
                ))}
                <td className="num-cell" style={{ fontWeight: 600 }}>{formatNum(node.sum)}</td>
                <td className="num-cell">{formatNum(node.average)}</td>
              </tr>
            ))}
            <tr className="sum">
              {footer.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default StatisticsTable;
