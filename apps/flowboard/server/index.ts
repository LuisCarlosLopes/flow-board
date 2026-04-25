import { serve } from '@hono/node-server'
import { app } from './app.ts'

const port = Number(process.env.BFF_PORT ?? 8787)

serve({ fetch: app.fetch, port }, (i) => {
  console.log(`[flowboard-bff] http://127.0.0.1:${i.port}/api/flowboard/health`)
})
