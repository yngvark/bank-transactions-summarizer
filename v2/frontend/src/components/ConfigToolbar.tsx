import { useRef } from 'react';
import { useConfig } from '../context/ConfigContext';

interface ConfigToolbarProps {
  onError: (message: string) => void;
}

function ConfigToolbar({ onError }: ConfigToolbarProps) {
  const { isDirty, saveToFile, loadFromFile } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await loadFromFile(file);
    } catch (err) {
      onError((err as Error).message);
    }
  };

  return (
    <div className="config-toolbar">
      <button
        type="button"
        className="config-toolbar-button"
        onClick={handleLoadClick}
        data-testid="config-load"
      >
        Load
      </button>
      <button
        type="button"
        className="config-toolbar-button"
        onClick={saveToFile}
        data-testid="config-save"
        aria-label={isDirty ? 'Save (unsaved changes)' : 'Save'}
      >
        {isDirty && <span className="config-dirty-dot" aria-hidden>{'● '}</span>}
        Save
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
