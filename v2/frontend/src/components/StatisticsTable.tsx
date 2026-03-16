import { useState, useMemo, useCallback } from 'react';
import { GroupedStatistics, ColorConfig, CategoryTreeNode } from '../../../shared/types';

interface StatisticsTableProps {
  statistics: GroupedStatistics;
}

const COLOR_CONFIG: ColorConfig = {
  MAX_RED_RATIO: 2.0,
  MAX_GREEN_RATIO: 0.5,
  MAX_RED_COLOR: '#fca5a5',    // Soft coral red
  MAX_GREEN_COLOR: '#86efac',  // Soft mint green
  NEUTRAL_COLOR: '#ffffff',
};

function calculateCellColor(cellValue: number, average: number): string {
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
}

function collectVisibleRows(
  nodes: CategoryTreeNode[],
  depth: number,
  expandState: Record<string, boolean>
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && !!expandState[node.path];
    rows.push({ node, depth, hasChildren, isExpanded });
    if (isExpanded) {
      rows.push(...collectVisibleRows(node.children, depth + 1, expandState));
    }
  }
  return rows;
}

function StatisticsTable({ statistics }: StatisticsTableProps) {
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const { categoryTree, yearMonths, footer } = statistics;

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
    walk(categoryTree);
    setExpandState(state);
  }, [categoryTree]);

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
      findMin(categoryTree, 0);
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
      expandAtDepth(categoryTree, 0);
      return next;
    });
  }, [categoryTree]);

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
      findMax(categoryTree, 0);
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
      collapseAtDepth(categoryTree, 0);
      return next;
    });
  }, [categoryTree]);

  const visibleRows = useMemo(
    () => collectVisibleRows(categoryTree, 0, expandState),
    [categoryTree, expandState]
  );

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
      </div>
      <div className="table-wrapper">
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
            {visibleRows.map(({ node, depth, hasChildren, isExpanded }) => (
              <tr key={node.path} className={`depth-${Math.min(depth, 3)}`}>
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
                        ? { backgroundColor: calculateCellColor(val, node.average) }
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
