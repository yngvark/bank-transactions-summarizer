import path from "path";
import csvMerger from "./csvMerger";

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const handler = async (req, res) => {
  const hasDataDir = "DATA_DIR" in process.env;

  if (hasDataDir) {
    const dataDir = process.env["DATA_DIR"];
    const filename1 = path.join(dataDir, "2017jan-2023apr.csv");
    // const filename2 = path.join(envHome, "2023-jan-feb-mar-apr.csv")
    const files = [filename1];

    const csvContent = await csvMerger.mergeCSVFiles(files);
    res.send(csvContent);
  }

  res.send({});
};

export default handler;
