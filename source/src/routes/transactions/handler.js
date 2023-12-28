import excelGetter from "./excelGetter.js";

/**
 * Health check endpoint
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const excelHandler = async (req, res) => {
  const hasDataDir = "DATA_DIR" in process.env;

  if (!hasDataDir) {
    const data = await excelGetter.getTestExcelData();
    res.send(data);

    return;
  }

  const data = await excelGetter.getExcelData();
  res.send(data);
};

export default excelHandler;
