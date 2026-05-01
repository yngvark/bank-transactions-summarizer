import { useRef, useState } from 'react';
import { useConfig } from '../context/useConfig';

interface ConfigToolbarProps {
  onError: (message: string) => void;
  onSuccess?: () => void;
}

function ConfigToolbar({ onError, onSuccess }: ConfigToolbarProps) {
  const { isDirty, exportToFile, importFromFile } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Importing a file will replace the current configuration. Continue?'
      )
    ) {
      return;
    }
    setIsImporting(true);
    try {
      await importFromFile(file);
      onSuccess?.();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="config-toolbar">
      <button
        type="button"
        className="config-toolbar-button"
        onClick={handleImportClick}
        disabled={isImporting}
        data-testid="config-import"
        aria-label={isImporting ? 'Importing configuration file' : 'Import configuration file'}
      >
        {isImporting ? 'Importing…' : 'Import config'}
      </button>
      <button
        type="button"
        className="config-toolbar-button"
        onClick={exportToFile}
        data-testid="config-export"
        aria-label={isDirty ? 'Export configuration (unexported changes)' : 'Export configuration'}
      >
        {isDirty && <span className="config-dirty-dot" aria-hidden>{'● '}</span>}
        Export config
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="config-file-input"
      />
    </div>
  );
}

export default ConfigToolbar;
