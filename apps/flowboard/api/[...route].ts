import { handle } from 'hono/vercel'
import { app } from '../server/app.ts'

export const config = {
  maxDuration: 60,
}

export default handle(app)
