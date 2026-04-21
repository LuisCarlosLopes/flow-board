import { test, expect } from '@playwright/test'
import { getE2ECredentials } from './helpers/e2e-env'
import { LoginPage } from './pages/login.page'

test.describe('@login FlowBoard — conexão GitHub', () => {
  test('exibe formulário de entrada', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    await expect(login.repoUrlInput).toBeVisible()
    await expect(login.patInput).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar' })).toBeVisible()
  })

  test('erro quando a URL do repositório é inválida', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.fillRepoUrl('não-é-uma-url')
    await login.fillPat('ghp_invalid_token_for_validation_only')
    await login.submit()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('erro quando o PAT está vazio', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.fillRepoUrl('https://github.com/octocat/Hello-World')
    await login.fillPat('')
    await login.submit()
    await expect(page.getByRole('alert')).toContainText(/personal access token/i)
  })

  test('credenciais do .env: conecta e exibe o quadro', async ({ page }) => {
    test.setTimeout(120_000)
    const { repoUrl, pat } = getE2ECredentials()
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
  })
})
