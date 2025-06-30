import statistics from "./statistics/statistics.js";
import parser from "./statistics/parser.js";
import generateRandomTransactions from "./randomize/main.js";
import renderTransactionsTable from "./render_transactions/main.js";

let categoryMapping = null;
let globalTransactions = [];

// Initialize category mapping (works in both browser and test environments)
async function initializeCategoryMapping() {
  if (!categoryMapping) {
    if (typeof window !== 'undefined' && window.d3) {
      categoryMapping = await d3.json("/categories");
    }
  }
  return categoryMapping;
}

// Color intensity configuration
const COLOR_CONFIG = {
  MAX_RED_RATIO: 2.0,   // Maximum red when spending is 2x average
  MAX_GREEN_RATIO: 0.5, // Maximum green when spending is 0.5x average  
  MAX_RED_COLOR: '#ff4444',
  MAX_GREEN_COLOR: '#44ff44',
  NEUTRAL_COLOR: '#ffffff'
};

let lastColorData = null; // For testing purposes

// Color calculation functions
function calculateCellColor(cellValue, average) {
  if (average === 0) return COLOR_CONFIG.NEUTRAL_COLOR;
  
  const ratio = cellValue / average;
  
  if (ratio >= COLOR_CONFIG.MAX_RED_RATIO) {
    return COLOR_CONFIG.MAX_RED_COLOR;
  } else if (ratio <= COLOR_CONFIG.MAX_GREEN_RATIO) {
    return COLOR_CONFIG.MAX_GREEN_COLOR;
  } else if (ratio > 1) {
    // Red range: 1 to MAX_RED_RATIO
    const intensity = (ratio - 1) / (COLOR_CONFIG.MAX_RED_RATIO - 1);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_RED_COLOR, intensity);
  } else {
    // Green range: MAX_GREEN_RATIO to 1
    const intensity = (1 - ratio) / (1 - COLOR_CONFIG.MAX_GREEN_RATIO);
    return interpolateColor(COLOR_CONFIG.NEUTRAL_COLOR, COLOR_CONFIG.MAX_GREEN_COLOR, intensity);
  }
}

function interpolateColor(color1, color2, ratio) {
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

// Called from index.js
async function loadDataAndRenderTable(transactions) {
  globalTransactions = transactions
  
  await initializeCategoryMapping();
  const transactionsWithCategory = await parser.parse(categoryMapping, transactions);
  const groupedTransactions = await statistics.calculate(d3, transactionsWithCategory);

  renderTables(groupedTransactions, transactionsWithCategory);

  enterToAndFromDate(globalTransactions);
}

// ------------------------------------------------------------------------------------------------------
// Functions called from GUI event listeners
// ------------------------------------------------------------------------------------------------------
async function filterAndRenderData() {
  const searchTerm = document.getElementById("search-term").value.toLowerCase();
  const periodFrom = document.getElementById("period-from").value.toLowerCase();
  const periodTo = document.getElementById("period-to").value.toLowerCase();

  // TODO: Since this is called from the GUI, we get data from a global variable. Improve this.
  let filteredTransactions = globalTransactions
      .filter(row => row["Text"].toLowerCase().includes(searchTerm))

  if (periodFrom !== undefined && periodFrom.length > 0) {
    filteredTransactions = filteredTransactions.filter(row =>
        new Date(row["BookDate"]) >= new Date(periodFrom)
    )
  }

  if (periodTo !== undefined && periodTo.length > 0) {
    filteredTransactions = filteredTransactions.filter(row =>
        new Date(row["BookDate"]) <= new Date(periodTo)
    )
  }
  // console.log("filteredTransactions", filteredTransactions)

  await initializeCategoryMapping();
  const transactionsWithCategory = await parser.parse(categoryMapping, filteredTransactions);
  const groupedTransactions = await statistics.calculate(d3, transactionsWithCategory);

  // console.log("Showing data for '" + searchTerm + "'", costs)
  renderTables(groupedTransactions, transactionsWithCategory);
}

async function randomizeAndRenderData() {
  const transactions = generateRandomTransactions();
  globalTransactions = transactions;

  await initializeCategoryMapping();
  const transactionsWithCategory = await parser.parse(categoryMapping, transactions);
  const groupedTransactions = await statistics.calculate(d3, transactionsWithCategory);

  renderTables(groupedTransactions, transactionsWithCategory)
}
// ------------------------------------------------------------------------------------------------------

function renderTables(groupedTransactions, transactionsWithCategory) {
  console.log("renderTables")
  renderTable(groupedTransactions);
  renderTransactionsTable(transactionsWithCategory);
}

function renderTable(costs) {
  const tableWrapper = d3.select(".table-wrapper");
  tableWrapper.html(""); // Clear the table-wrapper div

  const table = tableWrapper.append("table");
  const thead = table.append("thead");
  const tbody = table.append("tbody");

  thead
    .append("tr")
    .selectAll("th")
    .data(costs.header)
    .enter()
    .append("th")
    .text((d) => d);

  // Calculate colors for each cell
  const colorData = [];
  costs.rawTableData.forEach((rawRow, rowIndex) => {
    const rowColors = [];
    // Category column - no color
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);
    
    // Period columns - apply color based on value vs average
    rawRow.periodTotals.forEach(cellValue => {
      const color = calculateCellColor(cellValue, rawRow.average);
      rowColors.push(color);
    });
    
    // Sum and Average columns - no color
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);
    rowColors.push(COLOR_CONFIG.NEUTRAL_COLOR);
    
    colorData.push(rowColors);
  });

  // Store color data for testing
  lastColorData = {
    colorData,
    rawData: costs.rawTableData,
    yearMonths: costs.yearMonths
  };

  // Table data with colors
  tbody.selectAll("tr")
    .data(costs.tableData)
    .join("tr")
    .selectAll("td")
    .data((d, i) => d.map((cellData, j) => ({
      text: cellData,
      color: colorData[i] ? colorData[i][j] : COLOR_CONFIG.NEUTRAL_COLOR
    })))
    .join("td")
    .style("background-color", d => d.color)
    .text(d => d.text);

  // Footer row
  tbody.append("tr")
    .attr("class", "sum")
    .selectAll("td")
    .data(costs.footer)
    .enter()
    .append("td")
    .text(d => d);
}

function enterToAndFromDate(transactions) {
  let parsedTransactions = transactions.map(function(d) {
    return {...d, TransacationDateParsed: new Date(d["TransactionDate"])};
  });

  if (parsedTransactions.length === 0) {
    return;
  }

  parsedTransactions.sort((a, b) => a.TransacationDateParsed > b.TransacationDateParsed);

  // Period from
  const latestTransaction = parsedTransactions[parsedTransactions.length - 1];
  const year = latestTransaction.TransacationDateParsed.getFullYear();
  const yearOfLatestTransaction = `${year}-01-01`;

  // Period to
  const latestDate = latestTransaction.TransacationDateParsed;
  const latestDateISO = `${latestDate.getFullYear()}-${(latestDate.getMonth() + 1).toString().padStart(2, '0')}-${latestDate.getDate().toString().padStart(2, '0')}`;

  document.getElementById("period-from").value = yearOfLatestTransaction;
  document.getElementById("period-to").value = latestDateISO;

}

function useAi() {
  d3.json("/ai").then(function(data) {
    console.log("Success!", data);
  }).catch(function(error) {
    console.log("Oh no error!", error.response);
  });
}

// For testing purposes - export color data
function getLastColorData() {
  return lastColorData;
}

function calculateColorForTesting(cellValue, average) {
  return calculateCellColor(cellValue, average);
}

export default {
  loadDataAndRenderTable,
  filterAndRenderData,
  randomizeAndRenderData,
  useAi,
  getLastColorData,
  calculateColorForTesting,
  initializeCategoryMapping,
  COLOR_CONFIG
};
