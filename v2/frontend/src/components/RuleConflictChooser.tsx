import { useEffect } from 'react';
import { TextPatternRule } from '../../../shared/types';

interface RuleConflictChooserProps {
  existingRule: TextPatternRule;
  pickedCategory: [string, string];
  transactionText: string;
  onUpdateExisting: () => void;
  onCreateSpecific: () => void;
  onClose: () => void;
}

function RuleConflictChooser({
  existingRule,
  pickedCategory,
  transactionText,
  onUpdateExisting,
  onCreateSpecific,
  onClose,
}: RuleConflictChooserProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        className="rd-backdrop"
        onClick={onClose}
        data-testid="rule-conflict-backdrop"
      />
      <div
        className="rule-dialog open"
        role="dialog"
        aria-modal="true"
        data-testid="rule-conflict-chooser"
      >
        <header className="rd-header">
          <h3 className="rd-title">A rule already matches this transaction</h3>
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
          <div className="rd-section">
            <label className="rd-label">Transaction</label>
            <div className="rd-conflict-tx" data-testid="rule-conflict-tx-text">
              {transactionText}
            </div>
          </div>

          <div className="rd-section">
            <label className="rd-label">Existing rule</label>
            <div className="rd-category-badge" data-testid="rule-conflict-existing-category">
              {existingRule.category[0]} <span className="rd-sep">›</span>{' '}
              {existingRule.category[1]}
            </div>
            <div className="rd-conflict-pattern" data-testid="rule-conflict-existing-pattern">
              <span className="rd-conflict-pattern-label">{existingRule.type}:</span>{' '}
              <code>{existingRule.pattern}</code>
            </div>
          </div>

          <div className="rd-section">
            <label className="rd-label">You picked</label>
            <div className="rd-category-badge" data-testid="rule-conflict-picked-category">
              {pickedCategory[0]} <span className="rd-sep">›</span> {pickedCategory[1]}
            </div>
          </div>
        </div>

        <footer className="rd-footer rd-footer-stack">
          <button
            type="button"
            className="rd-button-primary"
            onClick={onCreateSpecific}
            data-testid="rule-conflict-create-specific"
          >
            Create new specific rule (above existing)
          </button>
          <button
            type="button"
            className="rd-button-ghost"
            onClick={onUpdateExisting}
            data-testid="rule-conflict-update-existing"
          >
            Update existing rule's category
          </button>
          <button
            type="button"
            className="rd-button-ghost"
            onClick={onClose}
            data-testid="rule-conflict-cancel"
          >
            Cancel
          </button>
        </footer>
      </div>
    </>
  );
}

export default RuleConflictChooser;
