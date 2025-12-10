async function calculate(d3, transactionsWithCategory) {
  const groupedData = groupData(d3, transactionsWithCategory);

  // convert groupedData to matrix
  const yearMonths = Array.from(groupedData.keys())
  const categories = Array.from(
    new Set(transactionsWithCategory
      .map((d) => d["Category"]))
  ).sort();

  // Create a number formatter with a space as a thousands separator
  const numberFormatter = new Intl.NumberFormat('nb-NO', {
    style: 'decimal',
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const rawTableData = [];
  const tableData = categories.map((category) => {
    const periodTotals = yearMonths.map(
      (yearMonth) => Math.round(groupedData.get(yearMonth)?.get(category)) || 0);

    // Calculate average
    const average = periodTotals.reduce((a, b) => a + b, 0) / periodTotals.length;
    const formattedAverage = numberFormatter.format(average);

    // Avoid floating point errors by summing cents/øre instead of floating point numbers
    const sum = periodTotals.reduce((a, b) => (a * 100 + b * 100) / 100);

    // Format periodTotals and sum using the Norwegian currency format
    const formattedPeriodTotals = periodTotals.map(value => numberFormatter.format(value));
    const formattedSum = numberFormatter.format(sum);

    // Store raw data for color calculations
    rawTableData.push({
      category,
      periodTotals,
      average,
      sum
    });

    return [category, ...formattedPeriodTotals, formattedSum, formattedAverage];
  });

  // Header
  const header = ["Category", ...yearMonths, "Sum", "Average"];

  // Footer
  const footerData = yearMonths.map((yearMonth) => {
    return categories.reduce((a, b) => {
      return Math.round(a + (groupedData.get(yearMonth)?.get(b) || 0));
    }, 0);
  });

  // Format footerData
  const formattedFooterData = footerData.map(value => numberFormatter.format(value));

  // Calculate sum of sums
  const sumOfSums = footerData.reduce((a, b) => a + b, 0);
  const formattedSumOfSums = numberFormatter.format(sumOfSums);

  // Calculate average of averages
  const averageOfAverages = footerData.reduce((a, b) => a + b, 0) / footerData.length;
  const formattedAverageOfAverages = numberFormatter.format(averageOfAverages);

  // Set footer
  const footer = ["Sum", ...formattedFooterData, formattedSumOfSums, formattedAverageOfAverages];

  return {
    header: header,
    tableData: tableData,
    footer: footer,
    rawTableData: rawTableData,
    yearMonths: yearMonths
  };
}

function groupData(d3, parsedData) {
  /*
  Translate from
  {
    0: {
      "Text": "SUBWAY",
      "Curreny Amount": "100"
    },
    // ... and so on
  }

  to a d3 grouped structure that looks like the following. Note it's not a
  pure map, it is a d3.js specific object, meaning we have to use d3.js to get
  data out of it.

  {
    0: {
      "2021-01": {
        "Reise ➡ Flyselskap": 1000,
        "Underholdning ➡ Film & Kino": 500
      }
      // ... and so on
    }
  }
  */
  return d3
    .rollup(
      parsedData,
      (v) => d3.sum(v, (d) => d.Amount),
      (d) => getDateKey(d.TransactionDate, d),
      (d) => d["Category"]
    );
}

function getDateKey(date, d) {
  try {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1);
  } catch (e) {
    console.log("Error parsing date:", d);
    throw e;
  }
}

function pad(n) {
  return n < 10 ? "0" + n : n;
}

// let nf = new Intl.NumberFormat("no");

// For debugging purposes:

// d3.csv("/transactions").then((data) => {
//   // Get unique strings from row["Merchant Category"]
//   const uniqueMerchantCategories = new Set(data.map((d) => d["Merchant Category"]));
//
//   for (const category of uniqueMerchantCategories) {
//     console.log(category);
//   }
// })

export default {
  calculate: calculate
};
