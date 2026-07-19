import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import routes from './routes/index.js'
import { errorMiddleware, notFound } from './utils/apiHandler.js'
import { CLIENT_URL, NODE_ENV } from './config/constants.js'

const app= express()

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}))
app.use(helmet())
if (NODE_ENV !== "production") {
    app.use(morgan("dev"));
}
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

app.use("/api", routes)

app.use(notFound)
app.use(errorMiddleware)

export default app
