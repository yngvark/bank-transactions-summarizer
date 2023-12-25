import statistics from "./statistics.js";
import generateCSV from "./randomize/main.js";
import renderTransactionsTable from "./render_transactions/main.js";

const categoryMapping = await d3.json("/categories");
let globalTransactions = [];

// Called from index.js
async function loadDataAndRenderTable() {
  const transactions = await d3.csv("/transactions");
  globalTransactions = transactions

  const transactionsWithCategory = await statistics.parse(categoryMapping, transactions);
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
  // console.log("randomTransactions", filteredTransactions)

  const transactionsWithCategory = await statistics.parse(categoryMapping, filteredTransactions);
  const groupedTransactions = await statistics.calculate(d3, transactionsWithCategory);

  // console.log("Showing data for '" + searchTerm + "'", costs)
  renderTables(groupedTransactions, transactionsWithCategory);
}

async function randomizeAndRenderData() {
  const csvWithRandomTransactions = generateCSV();

  const transactions = d3.csvParse(csvWithRandomTransactions);
  globalTransactions = transactions;

  const transactionsWithCategory = await statistics.parse(categoryMapping, transactions);
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