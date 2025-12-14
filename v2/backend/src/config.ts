import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

interface Config {
  version: string;
  name: string;
  description: string;
  nodeEnv: string;
  port: number;
  clientOrigins: {
    development: string;
    production: string;
  };
  dataDir: string | undefined;
}

const config: Config = {
  version: packageJson.version,
  name: packageJson.name,
  description: packageJson.description,

  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),

  clientOrigins: {
    development: process.env['DEV_ORIGIN'] ?? '*',
    production: process.env['PROD_ORIGIN'] ?? 'none',
  },

  dataDir: process.env['DATA_DIR'],
};

export default config;
