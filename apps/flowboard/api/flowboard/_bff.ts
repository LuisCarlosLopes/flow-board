/**
 * Vercel (Vite, não-Next) não aplica `api/[...catch].ts` a todos os segmentos como o Next;
 * mapeia-se com ficheiros explícitos; todos usam o mesmo Hono.
 */
import { handle } from 'hono/vercel'
import { app } from '../../server/app.js'

export const config = {
  maxDuration: 60,
}

export default handle(app)
