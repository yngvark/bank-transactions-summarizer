import { useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';

const DENSITIES = [
  { value: 'compact', label: 'Compact', fontSize: '0.65rem', headerSize: '0.55rem', padding: '0.2rem 0.3rem' },
  { value: 'normal', label: 'Normal', fontSize: '0.8rem', headerSize: '0.7rem', padding: '0.5rem 0.65rem' },
  { value: 'comfortable', label: 'Comfortable', fontSize: '1rem', headerSize: '0.875rem', padding: '0.85rem 1.1rem' },
  { value: 'spacious', label: 'Spacious', fontSize: '1.25rem', headerSize: '1.1rem', padding: '1.2rem 1.5rem' },
];

export function applyDisplaySettings(density: string) {
  const root = document.documentElement;

  const config = DENSITIES.find(d => d.value === density) || DENSITIES[1];

  root.style.setProperty('--table-font-size', config.fontSize);
  root.style.setProperty('--table-header-font-size', config.headerSize);
  root.style.setProperty('--table-cell-padding', config.padding);
}

function DisplaySettings() {
  const { config, updateSettings } = useConfig();
  const { density, theme } = config.settings;
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="display-settings">
      <div className="display-settings-group">
        <span className="display-settings-label">Density:</span>
        <div className="segmented-control">
          {DENSITIES.map(d => (
            <button
              key={d.value}
              type="button"
              className={`segmented-control-button ${density === d.value ? 'active' : ''}`}
              onClick={() => updateSettings({ density: d.value })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-toggle">
        <span className="theme-toggle-label">Theme:</span>
        <button
          type="button"
          className="theme-toggle-button"
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}

export default DisplaySettings;
