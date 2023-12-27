import path from "path";
import csvHelper from "./csvHelper";
import { promises as fs } from 'fs';

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const handler = async (req, res) => {
  const hasDataDir = "DATA_DIR" in process.env;

  if (!hasDataDir) {
    const data = await getTestCsvData();
    res.send(data);

    return;
  }

  const data = await getCsvData();
  res.send(data);
};

async function getTestCsvData() {
  const dataDir = __dirname;
  const filePath = path.join(dataDir, "test.csv");
  console.log("Returning file: ", filePath);

  return await fs.readFile(filePath, 'utf8');
}

async function getCsvData() {
  const dataDir = process.env["DATA_DIR"];
  console.log("DATA_DIR: ", dataDir);

  let csvFiles;
  try {
    const files = await fs.readdir(dataDir);
    csvFiles = files
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(dataDir, file));
  } catch (error) {
    console.error("Error reading data directory: ", error);
    throw error
  }

  return await csvHelper.mergeCSVFiles(csvFiles);
}

export default handler;
