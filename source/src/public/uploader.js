import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";
import renderer from "./renderer.js";

function upload(event) {
    showLoaderGif();

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates:true });

        // Process the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to JSON
        const transactions = XLSX.utils.sheet_to_json(worksheet);

        renderer.loadDataAndRenderTable(transactions);

        // Convert sheet to HTML (or you can process it as needed)
        // const htmlStr = XLSX.utils.sheet_to_html(worksheet);
        // document.getElementById('dataOutput').innerHTML = htmlStr;
    };

    reader.readAsArrayBuffer(file);
}

function showLoaderGif() {
    const div = document.querySelector('.table-wrapper');

    if (div) {
        div.innerHTML = `
            <img src="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.3/images/loading.gif"
                 height="15" width="15"/> Calculating...
        ` + div.innerHTML;
    }
}

export default {
    upload: upload
}