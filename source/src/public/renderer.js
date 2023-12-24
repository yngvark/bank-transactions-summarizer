import statistics from "./statistics.js";
import generateCSV from "./randomize/main.js";
import renderTransactionsTable from "./render_transactions/main.js";

const categoryMapping = await d3.json("/categories");
let globalTransactions = [];

// Called from index.js
async function loadDataAndRenderTable() {
  globalTransactions = await d3.csv("/transactions");

  const groupedTransactions = await statistics.calculate(d3, categoryMapping, globalTransactions);
  renderTables(groupedTransactions, globalTransactions);

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
  // console.log("randomTransactions", filteredTransactions)

  const groupedTransactions = await statistics.calculate(d3, categoryMapping, filteredTransactions);

  // console.log("Showing data for '" + searchTerm + "'", costs)
  renderTables(groupedTransactions, filteredTransactions);
}

async function randomizeAndRenderData() {
  const csv = generateCSV();

  const randomTransactions = d3.csvParse(csv);
  globalTransactions = randomTransactions;

  const groupedTransactions = await statistics.calculate(d3, categoryMapping, randomTransactions);
  renderTables(groupedTransactions, randomTransactions)
}
// ------------------------------------------------------------------------------------------------------

function renderTables(groupedTransactions, rawTransactions) {
  console.log("renderTables")
  renderTable(groupedTransactions);
  renderTransactionsTable(rawTransactions);
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

  // Table data
  tbody.selectAll("tr")
    .data(costs.tableData)
    .join("tr")
    .selectAll("td")
    .data(d => d)
    .join("td")
    .text(d => d);

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

  const firstTransaction = parsedTransactions[0];
  const latestTransaction = parsedTransactions[parsedTransactions.length - 1];

  const firstDateISO = firstTransaction.TransacationDateParsed.toISOString().split('T')[0]
  const latestDateISO = latestTransaction.TransacationDateParsed.toISOString().split('T')[0]

  document.getElementById("period-from").value = firstDateISO
  document.getElementById("period-to").value = latestDateISO
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