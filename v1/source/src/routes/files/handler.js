import path from "path";
import fs from "fs";
import config from "../../config.js";

/**
 * List Excel files in DATA_DIR
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const listFiles = (req, res) => {
  if (!config.dataDir) {
    return res.json({ hasDataDir: false, files: [] });
  }

  try {
    const files = fs.readdirSync(config.dataDir)
      .filter(file => file.match(/\.(xlsx|xls)$/i));
    
    res.json({ 
      hasDataDir: true, 
      dataDir: config.dataDir,
      files 
    });
  } catch (error) {
    console.error("Error reading DATA_DIR:", error);
    res.status(500).json({ error: "Failed to read DATA_DIR" });
  }
};

/**
 * Serve default transactions.xlsx from DATA_DIR
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const serveDefaultFile = (req, res) => {
  if (!config.dataDir) {
    return res.status(404).json({ error: "DATA_DIR not configured" });
  }

  const filePath = path.join(config.dataDir, "transactions.xlsx");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Default transactions.xlsx not found in DATA_DIR" });
  }

  res.sendFile(filePath);
};

/**
 * Check if DATA_DIR is configured and has default file
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const checkDefaultFile = (req, res) => {
  if (!config.dataDir) {
    return res.json({ hasDataDir: false, hasDefaultFile: false });
  }

  const filePath = path.join(config.dataDir, "transactions.xlsx");
  const hasDefaultFile = fs.existsSync(filePath);
  
  res.json({ 
    hasDataDir: true, 
    hasDefaultFile,
    dataDir: config.dataDir 
  });
};

export { listFiles, serveDefaultFile, checkDefaultFile };