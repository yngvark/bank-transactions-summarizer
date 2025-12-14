import express from 'express';
import { listFiles, serveDefaultFile, checkDefaultFile } from './handler.js';

const router = express.Router();

router.get('/list', listFiles);
router.get('/default', serveDefaultFile);
router.get('/check', checkDefaultFile);

export default router;
