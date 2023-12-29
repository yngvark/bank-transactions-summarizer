import statistics from "./statistics/statistics.js";
import parser from "./statistics/parser.js";
import generateRandomTransactions from "./randomize/main.js";
import renderTransactionsTable from "./render_transactions/main.js";

const categoryMapping = await d3.json("/categories");
let globalTransactions = [];

// Called from index.js
async function loadDataAndRenderTable(transactions) {
  globalTransactions = transactions
  
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

  const transactionsWithCategory = await parser.parse(categoryMapping, filteredTransactions);
  const groupedTransactions = await statistics.calculate(d3, transactionsWithCategory);

  // console.log("Showing data for '" + searchTerm + "'", costs)
  renderTables(groupedTransactions, transactionsWithCategory);
}

async function randomizeAndRenderData() {
  const transactions = generateRandomTransactions();
  globalTransactions = transactions;

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

  // Append headers
  thead.append("tr")
      .selectAll("th")
      .data(costs.header)
      .enter()
      .append("th")
      .text(d => d);

  // Determine the index of the category average
  const avgIndex = costs.header.indexOf("Average");

  // Append table rows
  tbody.selectAll("tr")
      .data(costs.tableData)
      .join("tr")
      .selectAll("td")
      .data(row => prepareRowData(row, avgIndex))
      .join("td")
      .text(d => d.value)
      .attr("style", d => getColorStyle(d));

  // Append footer row
  tbody.append("tr")
      .attr("class", "sum")
      .selectAll("td")
      .data(costs.footer)
      .enter()
      .append("td")
      .text(d => d);
}

function prepareRowData(row, avgIndex) {
  return row.map((cell, index) => ({
    value: cell,
    isPeriod: index > 0 && index < avgIndex,
    avgValue: row[avgIndex]
  }));
}

function getColorStyle(d) {
  if (!d.isPeriod) return null;

  const deviationThreshold = 0.01; // Define your threshold (10% in this case)
  const deviation = (d.value - d.avgValue) / d.avgValue;

  if (deviation <= -deviationThreshold) {
    return 'color: red;'; // Negative deviation more than threshold
  } else if (deviation >= deviationThreshold) {
    return 'color: green;'; // Positive deviation more than threshold
  }
  return null; // No significant deviation
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

export default {
  loadDataAndRenderTable,
  filterAndRenderData,
  randomizeAndRenderData,
  useAi
};