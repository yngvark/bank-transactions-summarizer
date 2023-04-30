import path from "path";

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const handler = (req, res) => {
  const hasDataDir = "DATA_DIR" in process.env;

  if (hasDataDir) {
    const dataDir = process.env["DATA_DIR"];
    const filePath = path.join(dataDir, "categories.json");
    res.sendFile(filePath);
    return;
  }

  const dataDir = __dirname;
  const filePath = path.join(dataDir, "categories.json");

  res.sendFile(filePath);
};

export default handler;
