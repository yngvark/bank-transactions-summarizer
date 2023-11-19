import express from "express";
import transactionsHandler from "./routes/transactions/handler";
import categoriesHandler from "./routes/categories/handler";
import aiHandler from "./routes/ai/handler";
import path from "path";

const app = express()

let publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir));

app.use('/transactions', transactionsHandler)
app.use('/categories', categoriesHandler)
app.use('/ai', aiHandler)

export default app

// ---------------------------------
// Commented stuff
// ---------------------------------

// Apply most middleware first
/*
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors({
    origin: config.clientOrigins[config.nodeEnv]
}))
app.use(helmet())
app.use(morgan('tiny'))

// Apply routes before error handling
app.use('/', root)

// Apply error handling last
app.use(fourOhFour)
app.use(errorHandler)
*/