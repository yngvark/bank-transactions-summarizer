import path from "path";
import csvMerger from "./csvMerger";

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const handler = async (req, res) => {
  const hasDataDir = "DATA_DIR" in process.env;

  if (!hasDataDir) {
    res.send({});
    return;
  }

  const dataDir = process.env["DATA_DIR"];
  console.log("DATA_DIR: ", dataDir);

  const f1 = path.join(dataDir, "2017jan-2023apr.csv");
  const f2 = path.join(dataDir, "2023-mai.csv");
  // const filename2 = path.join(envHome, "2023-jan-feb-mar-apr.csv")
  const files = [f1, f2];

  const csvContent = await csvMerger.mergeCSVFiles(files);
  res.send(csvContent);
};

export default handler;
