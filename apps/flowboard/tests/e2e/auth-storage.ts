import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Raiz do app `flowboard` (onde está `playwright.config.ts`). */
export function getFlowboardRoot(): string {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)))
}

/** Onde o setup grava o estado para `storageState` dos projetos autenticados. */
export function getAuthStoragePath(): string {
  return path.join(getFlowboardRoot(), 'tests/e2e/.auth/user.json')
}
