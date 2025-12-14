import { KeyboardEvent } from 'react';

interface SearchControlsProps {
  searchTerm: string;
  periodFrom: string;
  periodTo: string;
  onSearchChange: (value: string) => void;
  onPeriodFromChange: (value: string) => void;
  onPeriodToChange: (value: string) => void;
  onRandomize: () => void;
}

function SearchControls({
  searchTerm,
  periodFrom,
  periodTo,
  onSearchChange,
  onPeriodFromChange,
  onPeriodToChange,
  onRandomize,
}: SearchControlsProps) {
  const handlePeriodKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Triggers filter via state change
    }
  };

  return (
    <div className="search-container">
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="regular-button randomize-button" onClick={onRandomize}>
          Load Sample Data
        </button>
      </div>

      <div className="period-fields-wrapper">
        <span className="period-text">From</span>
        <input
          type="date"
          className="period-input"
          value={periodFrom}
          onChange={(e) => onPeriodFromChange(e.target.value)}
          onKeyDown={handlePeriodKeyDown}
        />
        <span className="period-text">To</span>
        <input
          type="date"
          className="period-input"
          value={periodTo}
          onChange={(e) => onPeriodToChange(e.target.value)}
          onKeyDown={handlePeriodKeyDown}
        />
      </div>
    </div>
  );
}

export default SearchControls;
