import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

/**
 * BFF fora do Vite. Usar `dotenv` (e não `vite`/`loadEnv`) para não puxar o Vite
 * no bundle do serverless (Vercel) — isso provocava FUNCTION_INVOCATION_FAILED.
 * Em Vercel não há `.env` no deploy; o painel injeta `process.env`.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const paths = [path.join(appRoot, '.env'), path.join(appRoot, '.env.local')]
for (const p of paths) {
  dotenv.config({ path: p })
}
