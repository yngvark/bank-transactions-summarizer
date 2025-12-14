import { GroupedStatistics, ColorConfig } from '../../../shared/types';

interface StatisticsTableProps {
  statistics: GroupedStatistics;
}

const COLOR_CONFIG: ColorConfig = {
  MAX_RED_RATIO: 2.0,
  MAX_GREEN_RATIO: 0.5,
  MAX_RED_COLOR: '#ff4444',
  MAX_GREEN_COLOR: '#44ff44',
  NEUTRAL_COLOR: '#ffffff',
};

function calculateCellColor(cellValue: number, average: number): string {
  if (average === 0) return COLOR_CONFIG.NEUTRAL_COLOR;

  const ratio = cellValue / average;

  if (ratio >= COLOR_CONFIG.MAX_RED_RATIO) {
    return COLOR_CONFIG.MAX_RED_COLOR;
  } else if (ratio <= COLOR_CONFIG.MAX_GREEN_RATIO) {
    return COLOR_CONFIG.MAX_GREEN_COLOR;
  } else if (ratio > 1) {
    const intensity = (ratio - 1) / (COLOR_CONFIG.MAX_RED_RATIO - 1);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_RED_COLOR, intensity);
  } else {
    const intensity = (1 - ratio) / (1 - COLOR_CONFIG.MAX_GREEN_RATIO);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_GREEN_COLOR, intensity);
  }
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function StatisticsTable({ statistics }: StatisticsTableProps) {
  // Calculate colors for each cell
  const colorData: string[][] = statistics.rawTableData.map((rawRow) => {
    const rowColors: string[] = [];
    // Category column - no color
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);

    // Period columns - apply color based on value vs average
    rawRow.periodTotals.forEach((cellValue) => {
      const color = calculateCellColor(cellValue, rawRow.average);
      rowColors.push(color);
    });

    // Sum and Average columns - no color
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);

    return rowColors;
  });

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {statistics.header.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statistics.tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    backgroundColor: colorData[rowIndex]?.[cellIndex] || COLOR_CONFIG.NEUTRAL_COLOR,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className="sum">
            {statistics.footer.map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default StatisticsTable;
