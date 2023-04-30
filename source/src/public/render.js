import statistics from "./statistics.js";
import generateCSV from "./randomize/main.js";
import renderTransactionsTable from "./render_transactions/main.js";

const categoryMapping = await d3.json("/categories");
let globalTransactions = [];

// Called from index.js
async function loadDataAndRenderTable() {
  globalTransactions = await d3.csv("/transactions");  // TODO: Upload from frontend instead of loading from backend
  const groupedTransactions = await statistics.calculate(d3, categoryMapping, globalTransactions);
  renderTables(groupedTransactions, globalTransactions);
}

// ------------------------------------------------------------------------------------------------------
// Functions called from GUI event listeners
// ------------------------------------------------------------------------------------------------------
async function filterAndRenderData() {
  const searchTerm = document.getElementById("search-term").value.toLowerCase();

  // TODO: Since this is called from the GUI, we get data from a global variable. Improve this.
  const filteredTransactions = globalTransactions.filter(row => {
    return row["Text"].toLowerCase().includes(searchTerm);
  });
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


export default {
  loadDataAndRenderTable,
  filterAndRenderData,
  randomizeAndRenderData
};