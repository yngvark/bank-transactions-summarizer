import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GroupedStatistics, ColorConfig, CategoryTreeNode } from '../../../shared/types';
import { useConfig } from '../context/useConfig';
import type { CategoryTree, CategoryNode } from '../../../shared/types';
import {
  renameAt,
  addChildAt,
  addRoot,
  deleteAt,
  getNodeAt,
  countDescendants,
  namePathOf,
  rewriteRulesForRename,
  rewriteMappingsForRename,
  collectAffectedRules,
  collectAffectedMappings,
  deleteFromMappings,
  reorderSiblings,
  setEmojiAt,
} from '../services/categoryEdit';

const EMOJI_SET = ['🍔','🍕','🥗','☕','🍷','🛒','🛍️','👕','👟','🏠','🛋️','🔧','✈️','🚆','🚗','🚕','🏨','💵','💳','🏦','📱','💻','🎬','🎮','📚','🏋️','⚽','🎨','🎵','🐾','🌿','🎁','📦','💼','🏥','💊','✏️','📝','💡','🌍'];

interface StatisticsTableProps {
  statistics: GroupedStatistics;
  onToast?: (msg: string) => void;
}

function findEmojiForRoot(tree: CategoryTree, idx: number): string | undefined {
  return tree[idx]?.emoji;
}

function countNodeDescendants(node: CategoryTreeNode): number {
  let n = 0;
  for (const c of node.children) n += 1 + countNodeDescendants(c);
  return n;
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
  amountsByPath: Map<string, { periodTotals: number[]; sum: number; average: number }>,
  periodCount: number
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
          : new Array(periodCount).fill(0);
      const sum = amounts ? amounts.sum : periodTotals.reduce((a, b) => a + b, 0);
      const count = periodTotals.length;
      const average = amounts ? amounts.average : count > 0 ? sum / count : 0;
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

function StatisticsTable({ statistics, onToast }: StatisticsTableProps) {
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const { categoryTree, yearMonths, footer } = statistics;
  const { config, updateCategories, updateRules, updateMerchantMappings } = useConfig();
  const [editing, setEditing] = useState(false);
  const [savedExpand, setSavedExpand] = useState<Record<string, boolean> | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: number[]; initial: string } | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{ rect: DOMRect; path: number[] } | null>(null);
  const dragRef = useRef<{ path: number[] } | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const emitToast = useCallback((msg: string) => {
    onToast?.(msg);
  }, [onToast]);

  const editTree = useMemo(() => {
    const amounts = flattenAmountsByJoinedName(statistics);
    return buildEditTreeNodes(config.categories, amounts, statistics.yearMonths.length);
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

  useEffect(() => {
    if (!editing) return;
    const tbody = tbodyRef.current;
    if (!tbody) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches('[data-drag-handle]')) return;
      const tr = target.closest('tr[data-path]') as HTMLTableRowElement | null;
      if (!tr) return;
      dragRef.current = { path: tr.dataset.path!.split('.').map(Number) };
      tr.style.opacity = '0.5';
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const sourcePath = drag.path;
      const parentPrefix = sourcePath.slice(0, -1).join('.');
      const siblingRows = Array.from(
        tbody.querySelectorAll<HTMLTableRowElement>('tr[data-path]')
      ).filter((r) => {
        const p = r.dataset.path!.split('.').map(Number);
        return p.length === sourcePath.length && p.slice(0, -1).join('.') === parentPrefix;
      });
      const target = siblingRows.find((r) => {
        const rect = r.getBoundingClientRect();
        return e.clientY >= rect.top && e.clientY <= rect.bottom;
      });
      if (!target) return;
      const targetPath = target.dataset.path!.split('.').map(Number);
      const sourceIdx = sourcePath[sourcePath.length - 1];
      const targetIdx = targetPath[targetPath.length - 1];
      if (sourceIdx === targetIdx) return;
      const next = reorderSiblings(config.categories, sourcePath, targetIdx);
      updateCategories(next);
      drag.path = [...sourcePath.slice(0, -1), targetIdx];
    };
    const onMouseUp = () => {
      if (!dragRef.current) return;
      const tr = tbody.querySelector<HTMLTableRowElement>(
        `tr[data-path="${dragRef.current.path.join('.')}"]`
      );
      if (tr) tr.style.opacity = '';
      dragRef.current = null;
    };
    tbody.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      tbody.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [editing, config.categories, updateCategories]);

  useEffect(() => {
    if (!emojiPicker) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.emoji-picker') && !t.closest('.emoji-btn')) setEmojiPicker(null);
    };
    const id = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
    };
  }, [emojiPicker]);

  const startRename = useCallback((path: number[], initial: string) => {
    setRenameTarget({ path, initial });
  }, []);

  const commitRename = useCallback((newName: string) => {
    if (!renameTarget) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === renameTarget.initial) {
      setRenameTarget(null);
      return;
    }
    try {
      const oldNamePath = namePathOf(config.categories, renameTarget.path);
      const newTree = renameAt(config.categories, renameTarget.path, trimmed);
      const newRules = rewriteRulesForRename(config.rules.textPatternRules, oldNamePath, trimmed);
      const newMappings = rewriteMappingsForRename(config.rules.merchantCodeMappings, oldNamePath, trimmed);
      updateCategories(newTree);
      if (newRules !== config.rules.textPatternRules) updateRules(newRules);
      if (newMappings !== config.rules.merchantCodeMappings) updateMerchantMappings(newMappings);
      emitToast(`Renamed → ${trimmed}`);
    } catch (err) {
      emitToast((err as Error).message);
    }
    setRenameTarget(null);
  }, [
    renameTarget,
    config.categories,
    config.rules.textPatternRules,
    config.rules.merchantCodeMappings,
    updateCategories,
    updateRules,
    updateMerchantMappings,
    emitToast,
  ]);

  const onAddChild = useCallback((parentPath: number[]) => {
    let cand = 'New category';
    let n = 1;
    const parent = getNodeAt(config.categories, parentPath);
    while (parent.children.some((c) => c.name === cand)) {
      n++;
      cand = `New category ${n}`;
    }
    try {
      const { tree, path } = addChildAt(config.categories, parentPath, cand, { withPath: true });
      updateCategories(tree);
      setTimeout(() => setRenameTarget({ path, initial: cand }), 0);
    } catch (err) {
      emitToast((err as Error).message);
    }
  }, [config.categories, updateCategories, emitToast]);

  const onDelete = useCallback((path: number[], name: string) => {
    const node = getNodeAt(config.categories, path);
    const desc = countDescendants(node);
    const affectedRules = collectAffectedRules(
      config.rules.textPatternRules,
      config.categories,
      path
    );
    const affectedMappingKeys = collectAffectedMappings(
      config.rules.merchantCodeMappings,
      config.categories,
      path
    );
    const detail: string[] = [];
    if (desc > 0) detail.push(`${desc} descendant${desc === 1 ? '' : 's'}`);
    if (affectedRules.length > 0) detail.push(`${affectedRules.length} rule${affectedRules.length === 1 ? '' : 's'}`);
    if (affectedMappingKeys.length > 0) detail.push(`${affectedMappingKeys.length} merchant mapping${affectedMappingKeys.length === 1 ? '' : 's'}`);
    const detailStr = detail.length > 0 ? ` (along with ${detail.join(', ')})` : '';
    if (!confirm(`Delete "${name}"${detailStr}?`)) return;

    const newTree = deleteAt(config.categories, path);
    const newRules = config.rules.textPatternRules.filter((r) => !affectedRules.includes(r));
    const newMappings = deleteFromMappings(config.rules.merchantCodeMappings, affectedMappingKeys);

    updateCategories(newTree);
    if (newRules !== config.rules.textPatternRules) updateRules(newRules);
    if (newMappings !== config.rules.merchantCodeMappings) updateMerchantMappings(newMappings);
    emitToast(`Deleted "${name}"`);
  }, [
    config.categories,
    config.rules.textPatternRules,
    config.rules.merchantCodeMappings,
    updateCategories,
    updateRules,
    updateMerchantMappings,
    emitToast,
  ]);

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
          <tbody ref={tbodyRef}>
            {visibleRows.map(({ node, depth, hasChildren, isExpanded, indexPath }) => (
              <tr key={node.path} className={`depth-${Math.min(depth, 3)}`} data-path={indexPath.join('.')}>
                <td
                  className={!editing && hasChildren ? 'cat-cell-parent' : undefined}
                  onClick={!editing && hasChildren ? () => toggleNode(node.path) : undefined}
                >
                  <div className="cat-content">
                    <span className="indent" style={{ width: depth * 16 }} />
                    {editing && (
                      <span className="drag-handle" data-drag-handle title="Drag to reorder">{'⋮⋮'}</span>
                    )}
                    {hasChildren ? (
                      <span className={`chevron${isExpanded ? ' open' : ''}`}>{'\u25B6'}</span>
                    ) : (
                      <span className="no-chevron" />
                    )}
                    {depth === 0 ? (
                      editing ? (
                        <button
                          type="button"
                          className="emoji-btn editable"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setEmojiPicker({ rect, path: indexPath });
                          }}
                          data-testid={`cat-emoji-${indexPath.join('-')}`}
                        >
                          {findEmojiForRoot(config.categories, indexPath[0]) ?? '·'}
                        </button>
                      ) : (
                        <span className="emoji-btn">{findEmojiForRoot(config.categories, indexPath[0]) ?? ''}</span>
                      )
                    ) : null}
                    {renameTarget?.path.join('.') === indexPath.join('.') ? (
                      <input
                        autoFocus
                        defaultValue={renameTarget.initial}
                        className="cat-name-input"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename((e.target as HTMLInputElement).value);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setRenameTarget(null);
                          }
                        }}
                        onBlur={(e) => commitRename(e.target.value)}
                      />
                    ) : editing ? (
                      <span
                        className="cat-name editable"
                        data-rename-path={indexPath.join('.')}
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(indexPath, node.name);
                        }}
                      >
                        {node.name}
                      </span>
                    ) : (
                      <span>{node.name}</span>
                    )}
                    {editing && renameTarget?.path.join('.') !== indexPath.join('.') && (
                      <span className="row-actions">
                        <button
                          type="button"
                          className="icon-btn add"
                          title={`Add child under ${node.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddChild(indexPath);
                          }}
                          data-testid={`cat-add-${indexPath.join('-')}`}
                        >+</button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title={`Delete ${node.name}${
                            countNodeDescendants(node) > 0 ? ` (with ${countNodeDescendants(node)} descendants)` : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(indexPath, node.name);
                          }}
                          data-testid={`cat-delete-${indexPath.join('-')}`}
                        >{'×'}</button>
                      </span>
                    )}
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
            {editing && (
              <tr className="add-primary-row">
                <td colSpan={2 + yearMonths.length}>
                  <button
                    type="button"
                    className="add-primary-btn"
                    data-testid="cat-add-primary"
                    onClick={() => {
                      let cand = 'New category';
                      let n = 1;
                      while (config.categories.some((c) => c.name === cand)) {
                        n++;
                        cand = `New category ${n}`;
                      }
                      try {
                        const { tree, path } = addRoot(config.categories, cand, '📁');
                        updateCategories(tree);
                        setTimeout(() => setRenameTarget({ path, initial: cand }), 0);
                      } catch (err) {
                        emitToast((err as Error).message);
                      }
                    }}
                  >
                    + Add primary category
                  </button>
                </td>
              </tr>
            )}
            <tr className="sum">
              {footer.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {emojiPicker && (
        <div
          className="emoji-picker open"
          style={{
            position: 'fixed',
            top: emojiPicker.rect.bottom + 4,
            left: emojiPicker.rect.left,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {EMOJI_SET.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => {
                const next = setEmojiAt(config.categories, emojiPicker.path, em);
                updateCategories(next);
                setEmojiPicker(null);
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default StatisticsTable;
