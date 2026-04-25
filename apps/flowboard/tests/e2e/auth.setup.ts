import fs from 'node:fs'
import path from 'node:path'
import { test as setup, expect } from '@playwright/test'
import { hasForbiddenSerializedSecretMarkers } from '../../src/infrastructure/session/secretPayload'
import { getAuthStoragePath } from './auth-storage'
import { getE2ECredentials } from './helpers/e2e-env'
import { LoginPage } from './pages/login.page'

const authFile = getAuthStoragePath()
const authDir = path.dirname(authFile)

setup('persistir sessão GitHub', async ({ page }) => {
  setup.setTimeout(120_000)
  const { repoUrl, pat } = getE2ECredentials()
  fs.mkdirSync(authDir, { recursive: true })

  const login = new LoginPage(page)
  await login.goto()
  await login.connect(repoUrl, pat)

  const board = page.getByTestId('board-canvas')
  const alert = page.getByRole('alert')
  try {
    await board.waitFor({ state: 'visible', timeout: 90_000 })
  } catch {
    const hint = (await alert.isVisible()) ? await alert.innerText() : 'sem mensagem na tela'
    throw new Error(`Falha ao conectar (revise FLOWBOARD_E2E_REPO_URL e FLOWBOARD_E2E_PAT): ${hint}`)
  }
  await expect(board).toBeVisible()
  const storageState = await page.context().storageState()
  const serialized = JSON.stringify(storageState)
  if (hasForbiddenSerializedSecretMarkers(serialized)) {
    throw new Error('Setup E2E gerou storageState com segredo serializado em browser storage.')
  }
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2))
})
