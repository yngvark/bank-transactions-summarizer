const tableHeaders = ["Date", "Text", "Type", "Amount", "Merchant Category", "Category"];
const dataKeys = ["TransactionDate", "Text", "Type", "Amount", "Merchant Category", "Category"];

// Generate the table with given data

function renderTransactionsTable(transactionsWithCategory) {
  const table = d3.select("#transactions-table")
  table.html("");

  const thead = table.append("thead");
  const tbody = table.append("tbody");

  // Add table headers
  thead
    .append("tr")
    .selectAll("th")
    .data(tableHeaders)
    .join("th")
    .text(d => d);

  // Add table rows
  const rows = tbody
    .selectAll("tr")
    .data(transactionsWithCategory)
    .join("tr");

  // Add table cells
  rows
    .selectAll("td")
    .data((row, i) =>
      dataKeys.map(key => {
        return { key, value: row[key] };
      })
    )
    .join("td")
    .text(d => d.value);
}

export default renderTransactionsTable;
