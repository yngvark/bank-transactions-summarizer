import path from 'path';
import fs from 'fs';
import { Request, Response, RequestHandler } from 'express';
import config from '../../config.js';

interface ListFilesResponse {
  hasDataDir: boolean;
  dataDir?: string;
  files: string[];
}

interface CheckFileResponse {
  hasDataDir: boolean;
  hasDefaultFile: boolean;
  dataDir?: string;
}

interface ErrorResponse {
  error: string;
}

export const listFiles: RequestHandler = (req: Request, res: Response): void => {
  if (!config.dataDir) {
    res.json({ hasDataDir: false, files: [] } as ListFilesResponse);
    return;
  }

  try {
    const files = fs
      .readdirSync(config.dataDir)
      .filter((file) => file.match(/\.(xlsx|xls)$/i));

    res.json({
      hasDataDir: true,
      dataDir: config.dataDir,
      files,
    } as ListFilesResponse);
  } catch (error) {
    console.error('Error reading DATA_DIR:', error);
    res.status(500).json({ error: 'Failed to read DATA_DIR' } as ErrorResponse);
  }
};

export const serveDefaultFile: RequestHandler = (req: Request, res: Response): void => {
  if (!config.dataDir) {
    res.status(404).json({ error: 'DATA_DIR not configured' } as ErrorResponse);
    return;
  }

  const filePath = path.join(config.dataDir, 'transactions.xlsx');

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Default transactions.xlsx not found in DATA_DIR' } as ErrorResponse);
    return;
  }

  res.sendFile(filePath);
};

export const checkDefaultFile: RequestHandler = (req: Request, res: Response): void => {
  if (!config.dataDir) {
    res.json({ hasDataDir: false, hasDefaultFile: false } as CheckFileResponse);
    return;
  }

  const filePath = path.join(config.dataDir, 'transactions.xlsx');
  const hasDefaultFile = fs.existsSync(filePath);

  res.json({
    hasDataDir: true,
    hasDefaultFile,
    dataDir: config.dataDir,
  } as CheckFileResponse);
};
