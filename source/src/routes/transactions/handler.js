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
    const csvContent = await getTestData();
    res.send(csvContent);



    return;
  }

  const csvContent = await getData();
  res.send(csvContent);
};

async function getTestData() {
  const dataDir = __dirname;
  const filePath = path.join(dataDir, "test.csv");
  console.log("Returning file: ", filePath);

  return await fs.readFile(filePath, 'utf8');
}

async function getData() {
  const dataDir = process.env["DATA_DIR"];
  console.log("DATA_DIR: ", dataDir);

  // get all csv files in dataDir as an array
  const files = fs.readdirSync(dataDir).filter(fn => fn.endsWith(".csv"));
  return await csvHelper.mergeCSVFiles(files);
}

export default handler;
