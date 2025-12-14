import { Request, Response, RequestHandler } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const handler: RequestHandler = (req: Request, res: Response): void => {
  const hasDataDir = 'DATA_DIR' in process.env;

  if (!hasDataDir) {
    const dataDir = __dirname;
    const filePath = path.join(dataDir, 'categories.json');
    console.log('DATA_DIR missing - returning file: ', filePath);

    res.sendFile(filePath);
    return;
  }

  const dataDir = process.env['DATA_DIR']!;
  const filePath = path.join(dataDir, 'categories.json');
  res.sendFile(filePath);
};

export default handler;
