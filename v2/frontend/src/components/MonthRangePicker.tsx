import { useEffect, useMemo, useState } from 'react';

interface MonthRangePickerProps {
  periodFrom: string;
  periodTo: string;
  availableYears: number[];
  onRangeChange: (from: string, to: string) => void;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ymFromDate(date: string): string | null {
  if (!date || date.length < 7) return null;
  return date.slice(0, 7);
}

function absYM(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

function ymFromAbs(a: number): string {
  const y = Math.floor(a / 12);
  const m = (a % 12) + 1;
  return `${y}-${pad(m)}`;
}

function fmtYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function ymToFromDate(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${y}-${pad(m)}-01`;
}

function ymToToDate(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`;
}

function MonthRangePicker({
  periodFrom,
  periodTo,
  availableYears,
  onRangeChange,
}: MonthRangePickerProps) {
  const startYM = ymFromDate(periodFrom);
  const endYM = ymFromDate(periodTo);

  const years = useMemo(() => {
    const set = new Set<number>(availableYears);
    if (startYM) set.add(Number(startYM.slice(0, 4)));
    if (endYM) set.add(Number(endYM.slice(0, 4)));
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => a - b);
  }, [availableYears, startYM, endYM]);

  const initialYear = startYM
    ? Number(startYM.slice(0, 4))
    : years[years.length - 1];
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  // Keep tab in sync when external dates jump to a different year.
  useEffect(() => {
    if (!startYM) return;
    const year = Number(startYM.slice(0, 4));
    if (years.includes(year)) setSelectedYear(year);
  }, [startYM, years]);

  // Ensure selected tab is one of the rendered tabs.
  useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const [anchorYM, setAnchorYM] = useState<string | null>(null);
  const [hoverYM, setHoverYM] = useState<string | null>(null);

  const handleMonthClick = (ym: string) => {
    if (anchorYM == null) {
      setAnchorYM(ym);
      return;
    }
    const a = absYM(anchorYM);
    const b = absYM(ym);
    const lo = ymFromAbs(Math.min(a, b));
    const hi = ymFromAbs(Math.max(a, b));
    setAnchorYM(null);
    setHoverYM(null);
    onRangeChange(ymToFromDate(lo), ymToToDate(hi));
  };

  // Esc cancels mid-pick.
  useEffect(() => {
    if (anchorYM == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnchorYM(null);
        setHoverYM(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [anchorYM]);

  const cellState = (ym: string): 'edge' | 'in-range' | 'preview' | 'idle' => {
    if (anchorYM != null) {
      const a = absYM(anchorYM);
      const cm = absYM(ym);
      if (cm === a) return 'edge';
      if (hoverYM != null) {
        const h = absYM(hoverYM);
        const lo = Math.min(a, h);
        const hi = Math.max(a, h);
        if (cm >= lo && cm <= hi) return 'preview';
      }
      return 'idle';
    }
    if (startYM == null || endYM == null) return 'idle';
    const sAbs = absYM(startYM);
    const eAbs = absYM(endYM);
    const lo = Math.min(sAbs, eAbs);
    const hi = Math.max(sAbs, eAbs);
    const cm = absYM(ym);
    if (cm === lo || cm === hi) return 'edge';
    if (cm > lo && cm < hi) return 'in-range';
    return 'idle';
  };

  const summary = (() => {
    if (anchorYM != null) {
      if (hoverYM != null) {
        const a = absYM(anchorYM);
        const h = absYM(hoverYM);
        const lo = ymFromAbs(Math.min(a, h));
        const hi = ymFromAbs(Math.max(a, h));
        return lo === hi ? fmtYM(lo) : `${fmtYM(lo)} – ${fmtYM(hi)}`;
      }
      return `${fmtYM(anchorYM)} – …`;
    }
    if (startYM && endYM) {
      return startYM === endYM
        ? fmtYM(startYM)
        : `${fmtYM(startYM)} – ${fmtYM(endYM)}`;
    }
    return '';
  })();

  return (
    <div className="month-range-picker" data-testid="month-range-picker">
      <div className="year-tabs" role="tablist" aria-label="Year">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={y === selectedYear}
            className={`year-tab${y === selectedYear ? ' active' : ''}`}
            onClick={() => setSelectedYear(y)}
            data-testid={`year-tab-${y}`}
          >
            {y}
          </button>
        ))}
      </div>
      <div
        className="month-grid"
        onMouseLeave={() => setHoverYM(null)}
        role="grid"
        aria-label="Pick month range"
      >
        {MONTH_NAMES.map((name, i) => {
          const ym = `${selectedYear}-${pad(i + 1)}`;
          const state = cellState(ym);
          return (
            <button
              key={ym}
              type="button"
              className={`month-cell${state !== 'idle' ? ` ${state}` : ''}`}
              onClick={() => handleMonthClick(ym)}
              onMouseEnter={() => setHoverYM(ym)}
              data-testid={`month-cell-${ym}`}
              data-state={state}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="period-summary" data-testid="period-summary">
        {summary}
      </div>
    </div>
  );
}

export default MonthRangePicker;
