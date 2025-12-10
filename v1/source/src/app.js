import express from "express";
import categoriesHandler from "./routes/categories/handler";
import aiHandler from "./routes/ai/handler";
import filesRouter from "./routes/files/index.js";
import path from "path";

const app = express()

let publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir));

app.use('/categories', categoriesHandler)
app.use('/ai', aiHandler)
app.use('/files', filesRouter)

export default app
