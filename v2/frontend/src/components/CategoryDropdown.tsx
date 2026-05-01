import { useEffect, useMemo, useState } from 'react';
import type { CategoryTree, Rule } from '../../../shared/types';

interface CategoryDropdownProps {
  anchor: DOMRect;
  categories: CategoryTree;
  existingRule?: Rule;
  onPick: (primary: string, sub: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function CategoryDropdown({
  anchor,
  categories,
  existingRule,
  onPick,
  onRemove,
  onClose,
}: CategoryDropdownProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);

  const primaries = useMemo(() => categories.map((n) => n.name), [categories]);
  const subs = useMemo(() => {
    if (!selectedPrimary) return [];
    const node = categories.find((n) => n.name === selectedPrimary);
    return node ? node.children.map((c) => c.name) : [];
  }, [categories, selectedPrimary]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPrimary) {
          setSelectedPrimary(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, selectedPrimary]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${anchor.bottom + 4}px`,
    left: `${anchor.left}px`,
    minWidth: `${Math.max(anchor.width, 260)}px`,
  };

  return (
    <>
      <div
        className="cd-backdrop"
        onClick={onClose}
        data-testid="category-dropdown-backdrop"
      />
      <div className="category-dropdown open" style={style} role="menu">
        {selectedPrimary == null ? (
          <>
            {existingRule && (
              <button
                type="button"
                className="cd-item cd-item-danger"
                onClick={onRemove}
                data-testid="cd-remove"
              >
                <span className="cd-text">Remove rule</span>
              </button>
            )}
            {primaries.map((primary) => (
              <button
                type="button"
                key={primary}
                className="cd-item"
                onClick={() => setSelectedPrimary(primary)}
                data-testid={`cd-primary-${primary}`}
              >
                <span className="cd-text">{primary}</span>
                <span className="cd-chevron">›</span>
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              className="cd-item cd-item-back"
              onClick={() => setSelectedPrimary(null)}
            >
              <span className="cd-chevron cd-chevron-back">‹</span>
              <span className="cd-text">{selectedPrimary}</span>
            </button>
            {subs.map((sub) => (
              <button
                type="button"
                key={sub}
                className="cd-item cd-item-sub"
                onClick={() => onPick(selectedPrimary, sub)}
                data-testid={`cd-sub-${sub}`}
              >
                <span className="cd-text">{sub}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default CategoryDropdown;
