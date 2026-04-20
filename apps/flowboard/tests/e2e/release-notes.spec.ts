import { test, expect } from '@playwright/test'

test.describe('Release notes (public route)', () => {
  test('loads /releases and shows versions', async ({ page }) => {
    await page.goto('/releases')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('release-notes-back-home')).toBeVisible()
    await expect(page.getByRole('heading', { name: /notas de versão/i })).toBeVisible()
    await expect(page.getByTestId('release-card-0.1.0')).toBeVisible()
    await expect(page.getByTestId('release-card-0.2.0')).toBeVisible()
  })

  test('top bar navigates to home', async ({ page }) => {
    await page.goto('/releases')
    await page.getByTestId('release-notes-back-home').click()
    await expect(page).toHaveURL((u) => new URL(u).pathname === '/')
  })

  test('filter by feature updates visible changes', async ({ page }) => {
    await page.goto('/releases')
    await page.getByTestId('filter-feature').click()
    const card = page.getByTestId('release-card-0.2.0')
    await expect(card.getByText('Interface de histórico de versões')).toBeVisible()
    await expect(card.getByText('Otimização de performance')).toBeHidden()
  })

  test('archive badge on old release', async ({ page }) => {
    await page.goto('/releases')
    await expect(page.getByTestId('release-card-0.1.0').getByTestId('archive-badge')).toBeVisible()
  })
})

test.describe('Release notes (from app shell)', () => {
  test('version badge is visible and navigates to /releases', async ({ page }) => {
    await page.goto('/')
    const board = page.locator('[data-testid="board-canvas"]')
    const sessionOk = await board
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!sessionOk, 'Requires FlowBoard GitHub session so the board canvas loads')

    const badge = page.getByTestId('fb-version-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('v0.2.0')
    await badge.click()
    await expect(page).toHaveURL(/\/releases$/)
    await expect(page.getByRole('heading', { name: /notas de versão/i })).toBeVisible()
  })
})
