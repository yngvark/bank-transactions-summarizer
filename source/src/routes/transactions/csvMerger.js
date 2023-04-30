const fs = require('fs');

function readCSV(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        const lines = data.trim().split('\n');
        resolve(lines);
      }
    });
  });
}

async function mergeCSVFiles(inputFiles) {
  try {
    let headerRow = null;
    const allRows = [];

    for (const file of inputFiles) {
      const lines = await readCSV(file);

      if (!headerRow) {
        headerRow = lines[0];
      }

      const rows = lines.slice(1);
      allRows.push(...rows);
    }

    return headerRow + '\n' + allRows.join('\n');
  } catch (error) {
    console.error('Error merging CSV files:', error);
  }
}

export default {
  mergeCSVFiles: mergeCSVFiles
}
