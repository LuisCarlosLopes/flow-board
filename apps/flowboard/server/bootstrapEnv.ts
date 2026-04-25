import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

/**
 * BFF roda fora do Vite; variáveis em `apps/flowboard/.env` (ex.: SESSION_SECRET) não
 * chegam ao processo `tsx` automaticamente. Alinha com o carregamento em `playwright.config.ts`.
 * Em Vercel, o ficheiro .env geralmente não existe no bundle; `process.env` do runtime mantém prioridade
 * se definires variáveis no painel.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.env.NODE_ENV ?? 'development'
const loaded = loadEnv(mode, appRoot, '')
// Não sobrescrever chaves já definidas no runtime (ex.: Vercel, CI com segredos injectados)
for (const [key, value] of Object.entries(loaded)) {
  if (process.env[key] === undefined && value !== undefined) {
    process.env[key] = value
  }
}
