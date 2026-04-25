/**
 * Entrada BFF no deploy com raiz = repositório: o Vercel só descobre `/api` no topo;
 * com Root Directory = `apps/flowboard`, usa-se `apps/flowboard/api/[...route].ts`.
 */
import { handle } from 'hono/vercel'
import { app } from '../apps/flowboard/server/app.ts'

export const config = {
  maxDuration: 60,
}

export default handle(app)
