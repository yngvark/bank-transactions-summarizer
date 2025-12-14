import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import categoriesHandler from './api/categories/handler.js';
import aiHandler from './api/ai/handler.js';
import filesRouter from './api/files/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Serve static files from frontend build directory in production
// During development, frontend runs on its own dev server
const publicDir = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(publicDir));

app.use('/categories', categoriesHandler);
app.use('/ai', aiHandler);
app.use('/files', filesRouter);

export default app;
