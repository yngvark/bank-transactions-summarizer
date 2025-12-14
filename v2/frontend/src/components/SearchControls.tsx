import { KeyboardEvent } from 'react';

interface SearchControlsProps {
  searchTerm: string;
  periodFrom: string;
  periodTo: string;
  onSearchChange: (value: string) => void;
  onPeriodFromChange: (value: string) => void;
  onPeriodToChange: (value: string) => void;
  onRandomize: () => void;
  onUseAi: () => void;
}

function SearchControls({
  searchTerm,
  periodFrom,
  periodTo,
  onSearchChange,
  onPeriodFromChange,
  onPeriodToChange,
  onRandomize,
  onUseAi,
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
          placeholder="Search transactions"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="regular-button search-button">Search</button>
        <button className="regular-button randomize-button" onClick={onRandomize}>
          Randomize transactions
        </button>
        <button className="regular-button randomize-button" onClick={onUseAi}>
          Use AI
        </button>
      </div>

      <div className="period-fields-wrapper">
        <div className="period-text">Period from</div>
        <input
          type="text"
          className="period-input"
          placeholder="YYYY-MM-DD"
          value={periodFrom}
          onChange={(e) => onPeriodFromChange(e.target.value)}
          onKeyDown={handlePeriodKeyDown}
        />
        <div className="period-text">To</div>
        <input
          type="text"
          className="period-input"
          placeholder="YYYY-MM-DD"
          value={periodTo}
          onChange={(e) => onPeriodToChange(e.target.value)}
          onKeyDown={handlePeriodKeyDown}
        />
        <button className="regular-button period-button">Apply</button>
      </div>
    </div>
  );
}

export default SearchControls;
