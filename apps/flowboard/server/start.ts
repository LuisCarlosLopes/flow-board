import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sirv from 'sirv'
import { createBff } from './bffApp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '../dist')
const port = Number(process.env.PORT) || 4173

const sessionSecret = process.env.FLOWBOARD_SESSION_SECRET
if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret.length < 32)) {
  console.error('FATAL: set FLOWBOARD_SESSION_SECRET to at least 32 characters in production')
  process.exit(1)
}

const app = express()
app.disable('x-powered-by')
app.use(createBff())
app.use(
  sirv(dist, {
    single: true,
    dev: process.env.NODE_ENV !== 'production',
  }),
)

app.listen(port, () => {
  console.log(`FlowBoard server http://localhost:${port}`)
})
