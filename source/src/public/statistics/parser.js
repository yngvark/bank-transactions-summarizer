async function parse(categoryMapping, data) {
    let parsedData = data
        .filter((row) => row["TransactionDate"].length > 0)
        .filter(removeMyOwnInvoicePayments)
        .map((row) => {
            row["Text"] = row["Text"].trim();
            row["Merchant Category"] = row["Merchant Category"].trim();
            return row
        })
        .map((row) => {
            return {
                ...row,
                TransactionDate: new Date(row.TransactionDate)
            };
        });

    return parsedData
        .map((row) => {
            return {
                ...row,
                Category: getCategoryFromMapping(categoryMapping, row["Merchant Category"])
            };
        });
}

function removeMyOwnInvoicePayments(row) {
    const rowIsMyOwnInvoicePayment =
        row["Amount"] > 0 &&
        /^From \d+$/.test(row["Text"].trim());

    // if (rowIsMyOwnInvoicePayment) {
    // console.log("Excluding transaction", row)
    // }

    return !rowIsMyOwnInvoicePayment;
}


function getCategoryFromMapping(categoryMapping, key) {
    if (!categoryMapping.hasOwnProperty(key)) {
        // console.log("key not found: " + key);
        return "Ukjent kategori";
    }

    return categoryMapping[key][0] + " ➡ " + categoryMapping[key][1];
}

export default {
    parse: parse
}
