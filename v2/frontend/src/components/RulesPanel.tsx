import { useState } from 'react';
import { Rule } from '../../../shared/types';

interface RulesPanelProps {
  rules: Rule[];
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onEdit: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
}

function RulesPanel({ rules, onReorder, onEdit, onDelete }: RulesPanelProps) {
  const [open, setOpen] = useState(false);

  if (rules.length === 0) return null;

  return (
    <section className="rules-panel">
      <header className="rules-panel-header">
        <button
          type="button"
          className="rules-panel-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="rules-panel-toggle"
        >
          <span className={`rules-chevron ${open ? 'open' : ''}`}>▶</span>
          <span className="rules-title">
            Rules <span className="rules-count">({rules.length})</span>
          </span>
        </button>
        <span className="rules-hint">First match wins — higher in list = higher priority</span>
      </header>

      {open && (
        <ol className="rules-list" data-testid="rules-list">
          {rules.map((rule, index) => (
            <li key={rule.id} className="rules-row" data-testid={`rules-row-${rule.id}`}>
              <span className="rules-priority">#{index + 1}</span>
              <div className="rules-reorder">
                <button
                  type="button"
                  className="rules-reorder-btn"
                  onClick={() => onReorder(rule.id, 'up')}
                  disabled={index === 0}
                  aria-label="Move up"
                  data-testid={`rules-up-${rule.id}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rules-reorder-btn"
                  onClick={() => onReorder(rule.id, 'down')}
                  disabled={index === rules.length - 1}
                  aria-label="Move down"
                  data-testid={`rules-down-${rule.id}`}
                >
                  ↓
                </button>
              </div>
              <span
                className={`rules-field rules-field-${rule.field}`}
                title={rule.field === 'text' ? 'Matches transaction text' : 'Matches merchant category'}
              >
                {rule.field === 'text' ? 'Text' : 'Merch.'}
              </span>
              <span
                className={`rules-type rules-type-${rule.match}`}
                title={rule.match === 'substring' ? 'Substring' : rule.match === 'regex' ? 'Regex' : 'Exact'}
              >
                {rule.match === 'substring' ? 'Substring' : rule.match === 'regex' ? 'Regex' : 'Exact'}
              </span>
              <span className="rules-pattern">{rule.pattern}</span>
              <span className="rules-arrow">→</span>
              <span className="rules-category">
                {rule.category[0]} <span className="rules-category-sep">›</span>{' '}
                {rule.category[1]}
              </span>
              <div className="rules-actions">
                <button
                  type="button"
                  className="rules-action-btn"
                  onClick={() => onEdit(rule)}
                  data-testid={`rules-edit-${rule.id}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rules-action-btn rules-action-danger"
                  onClick={() => onDelete(rule)}
                  data-testid={`rules-delete-${rule.id}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default RulesPanel;
