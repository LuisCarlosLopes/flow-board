import type { Locator, Page } from '@playwright/test'

/**
 * Tela "Entrar": URL do repositório + Personal Access Token (GitHub).
 * Campos por `name` porque o botão de ajuda usa aria-label que contém "Personal Access Token".
 */
export class LoginPage {
  readonly repoUrlInput: Locator
  readonly patInput: Locator

  constructor(private readonly page: Page) {
    this.repoUrlInput = page.locator('input[name="repo-url"]')
    this.patInput = page.locator('input[name="repo-pat"]')
  }

  async goto() {
    await this.page.goto('/')
  }

  async fillRepoUrl(value: string) {
    await this.repoUrlInput.fill(value)
  }

  async fillPat(value: string) {
    await this.patInput.fill(value)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Conectar' }).click()
  }

  /** Fluxo completo de conexão (chama a API do GitHub). */
  async connect(repoUrl: string, pat: string) {
    await this.fillRepoUrl(repoUrl)
    await this.fillPat(pat)
    await this.submit()
  }
}
