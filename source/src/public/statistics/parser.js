async function parse(categoryMapping, data) {
    let parsedData = data
        .filter(removeMyOwnInvoicePayments)
        .map((row) => {
            return {
                ...row,
                "Text": row["Text"].trim(),
                "Merchant Category": row["Merchant Category"] ? row["Merchant Category"].trim() : "",
                // Ensure dates are Date objects for consistency
                "TransactionDate": typeof row["TransactionDate"] === 'string' ? new Date(row["TransactionDate"]) : row["TransactionDate"],
                "BookDate": typeof row["BookDate"] === 'string' ? new Date(row["BookDate"]) : row["BookDate"],
                "ValueDate": typeof row["ValueDate"] === 'string' ? new Date(row["ValueDate"]) : row["ValueDate"]
            };
        })
        
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
    //     console.log("Excluding transaction", row)
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
