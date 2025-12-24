interface DisplaySettingsProps {
  textSize: string;
  spacing: string;
  onTextSizeChange: (size: string) => void;
  onSpacingChange: (spacing: string) => void;
}

const TEXT_SIZES = [
  { value: 'compact', label: 'Compact', fontSize: '0.65rem', headerSize: '0.55rem' },
  { value: 'small', label: 'Small', fontSize: '0.75rem', headerSize: '0.65rem' },
  { value: 'medium', label: 'Medium', fontSize: '0.875rem', headerSize: '0.75rem' },
  { value: 'large', label: 'Large', fontSize: '1rem', headerSize: '0.875rem' },
];

const SPACINGS = [
  { value: 'tight', label: 'Tight', padding: '0.25rem 0.35rem' },
  { value: 'compact', label: 'Compact', padding: '0.4rem 0.5rem' },
  { value: 'normal', label: 'Normal', padding: '0.75rem 1rem' },
  { value: 'relaxed', label: 'Relaxed', padding: '1rem 1.25rem' },
];

export function applyDisplaySettings(textSize: string, spacing: string) {
  const root = document.documentElement;

  const sizeConfig = TEXT_SIZES.find(s => s.value === textSize) || TEXT_SIZES[1];
  const spacingConfig = SPACINGS.find(s => s.value === spacing) || SPACINGS[1];

  root.style.setProperty('--table-font-size', sizeConfig.fontSize);
  root.style.setProperty('--table-header-font-size', sizeConfig.headerSize);
  root.style.setProperty('--table-cell-padding', spacingConfig.padding);
}

function DisplaySettings({ textSize, spacing, onTextSizeChange, onSpacingChange }: DisplaySettingsProps) {
  return (
    <div className="display-settings">
      <label className="display-settings-label">
        Text size:
        <select
          className="display-settings-select"
          value={textSize}
          onChange={(e) => onTextSizeChange(e.target.value)}
        >
          {TEXT_SIZES.map(size => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>
      </label>

      <label className="display-settings-label">
        Spacing:
        <select
          className="display-settings-select"
          value={spacing}
          onChange={(e) => onSpacingChange(e.target.value)}
        >
          {SPACINGS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default DisplaySettings;
