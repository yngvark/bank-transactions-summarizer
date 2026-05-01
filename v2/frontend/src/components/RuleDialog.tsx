import { useEffect, useMemo, useState } from 'react';
import { Rule, RuleField, MatchKind, Transaction } from '../../../shared/types';
import { getMatchingTransactions, isValidRegex } from '../services/rules';

export type RuleDialogMode = 'create' | 'update' | 'delete';

interface RuleDialogProps {
  mode: RuleDialogMode;
  category: [string, string];
  initialField: RuleField;
  initialMatch: MatchKind;
  initialPattern: string;
  ruleId?: string;
  transactions: Transaction[];
  onSave: (rule: Rule) => void;
  onDelete: () => void;
  onClose: () => void;
}

const numberFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'decimal',
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function findMatchRange(text: string, pattern: string, match: MatchKind, field: RuleField): [number, number] | null {
  if (field !== 'text') return null;
  if (!pattern) return null;
  if (match === 'exact') return text === pattern ? [0, text.length] : null;
  if (match === 'substring') {
    const i = text.toLowerCase().indexOf(pattern.toLowerCase());
    if (i < 0) return null;
    return [i, i + pattern.length];
  }
  try {
    const m = text.match(new RegExp(pattern, 'i'));
    if (!m || m.index == null) return null;
    return [m.index, m.index + m[0].length];
  } catch {
    return null;
  }
}

function renderHighlighted(text: string, pattern: string, match: MatchKind, field: RuleField) {
  const range = findMatchRange(text, pattern, match, field);
  if (!range) return <>{text}</>;
  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rd-highlight">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function RuleDialog({
  mode,
  category,
  initialField,
  initialMatch,
  initialPattern,
  ruleId,
  transactions,
  onSave,
  onDelete,
  onClose,
}: RuleDialogProps) {
  const [field, setField] = useState<RuleField>(initialField);
  const [match, setMatch] = useState<MatchKind>(initialMatch);
  const [pattern, setPattern] = useState(initialPattern);

  const regexInvalid = match === 'regex' && pattern.length > 0 && !isValidRegex(pattern);

  const matches = useMemo(() => {
    if (mode === 'delete') {
      return getMatchingTransactions(transactions, initialPattern, initialMatch, initialField);
    }
    return getMatchingTransactions(transactions, pattern, match, field);
  }, [mode, transactions, pattern, match, field, initialPattern, initialMatch, initialField]);

  const canSave = pattern.trim().length > 0 && !regexInvalid && matches.length > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && mode !== 'delete' && canSave) {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, mode, onClose, pattern, match, field]);

  function save() {
    if (!canSave) return;
    onSave({
      id: ruleId ?? crypto.randomUUID(),
      field,
      match,
      pattern: pattern.trim(),
      category,
    });
  }

  const matchesLabel = regexInvalid
    ? 'Invalid regex'
    : matches.length === 0
      ? 'No matches'
      : `Matches: ${matches.length} transaction${matches.length === 1 ? '' : 's'}`;

  return (
    <>
      <div className="rd-backdrop" onClick={onClose} data-testid="rule-dialog-backdrop" />
      <div className="rule-dialog open" role="dialog" aria-modal="true">
        <header className="rd-header">
          <h3 className="rd-title">Category rule</h3>
          <button
            type="button"
            className="rd-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="rd-body">
          {mode !== 'delete' && (
            <>
              <div className="rd-section">
                <label className="rd-label">Category</label>
                <div className="rd-category-badge">
                  {category[0]} <span className="rd-sep">›</span> {category[1]}
                </div>
              </div>

              <div className="rd-section">
                <label className="rd-label">Match field</label>
                <div className="rd-type-toggle">
                  <button
                    type="button"
                    className={`rd-type-btn ${field === 'text' ? 'active' : ''}`}
                    onClick={() => setField('text')}
                    data-testid="rd-field-text"
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={`rd-type-btn ${field === 'merchantCategory' ? 'active' : ''}`}
                    onClick={() => setField('merchantCategory')}
                    data-testid="rd-field-merchantCategory"
                  >
                    Merchant Category
                  </button>
                </div>
              </div>

              <div className="rd-section">
                <label className="rd-label">Match type</label>
                <div className="rd-type-toggle">
                  <button
                    type="button"
                    className={`rd-type-btn ${match === 'substring' ? 'active' : ''}`}
                    onClick={() => setMatch('substring')}
                    data-testid="rd-type-substring"
                  >
                    Substring
                  </button>
                  <button
                    type="button"
                    className={`rd-type-btn ${match === 'regex' ? 'active' : ''}`}
                    onClick={() => setMatch('regex')}
                    data-testid="rd-type-regex"
                  >
                    Regex
                  </button>
                  <button
                    type="button"
                    className={`rd-type-btn ${match === 'exact' ? 'active' : ''}`}
                    onClick={() => setMatch('exact')}
                    data-testid="rd-type-exact"
                  >
                    Exact
                  </button>
                </div>
              </div>

              <div className="rd-section">
                <label className="rd-label" htmlFor="rd-pattern">
                  {field === 'text' ? 'Pattern (matches on transaction text)' : 'Pattern (matches on merchant category)'}
                </label>
                <input
                  id="rd-pattern"
                  type="text"
                  className={`rd-input ${regexInvalid ? 'input-error' : ''}`}
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  autoFocus
                  data-testid="rd-pattern"
                />
              </div>
            </>
          )}

          <div className="rd-section">
            <div
              className={`rd-preview-label ${
                regexInvalid
                  ? 'rd-preview-error'
                  : matches.length > 0
                    ? 'rd-preview-ok'
                    : ''
              }`}
              data-testid="rd-preview-label"
            >
              {matchesLabel}
            </div>
            <div className="rd-preview" data-testid="rd-preview">
              {matches.slice(0, 20).map((tx, i) => (
                <div key={i} className="rd-match-row">
                  <span className="rd-match-text">
                    {mode === 'delete'
                      ? renderHighlighted(tx.Text, initialPattern, initialMatch, initialField)
                      : renderHighlighted(tx.Text, pattern, match, field)}
                  </span>
                  <span className="rd-match-amount">
                    {numberFormatter.format(tx.Amount)}
                  </span>
                </div>
              ))}
              {matches.length > 20 && (
                <div className="rd-match-row rd-match-more">
                  +{matches.length - 20} more
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="rd-footer">
          {mode === 'update' && (
            <button
              type="button"
              className="rd-button-danger"
              onClick={onDelete}
              data-testid="rd-delete"
            >
              Delete rule
            </button>
          )}
          {mode === 'delete' && (
            <button
              type="button"
              className="rd-button-danger"
              onClick={onDelete}
              data-testid="rd-confirm-delete"
            >
              Delete rule
            </button>
          )}
          <div className="rd-footer-spacer" />
          <button type="button" className="rd-button-ghost" onClick={onClose}>
            Cancel
          </button>
          {mode === 'create' && (
            <button
              type="button"
              className="rd-button-primary"
              onClick={save}
              disabled={!canSave}
              data-testid="rd-create"
            >
              Create rule ✓
            </button>
          )}
          {mode === 'update' && (
            <button
              type="button"
              className="rd-button-primary"
              onClick={save}
              disabled={!canSave}
              data-testid="rd-update"
            >
              Update rule ✓
            </button>
          )}
        </footer>
      </div>
    </>
  );
}

export default RuleDialog;
