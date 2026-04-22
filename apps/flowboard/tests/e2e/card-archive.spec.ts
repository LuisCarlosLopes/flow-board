import { test, expect, type Page } from '@playwright/test'

/**
 * E2E smoke: arquivar card (persistência GitHub), secção Arquivados, busca com badge, abrir modal e restaurar.
 * Corre só em Chromium no playwright.config (Firefox/WebKit ignoram — mesmo repo que create-task).
 */

function openCreateFromFirstColumn(page: Page) {
  return page.locator('[data-testid^="column-add-card-"]').first()
}

function uniqTitle(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function createCardOnBoard(page: Page, title: string) {
  await openCreateFromFirstColumn(page).click()
  await page.waitForSelector('[data-testid="ctm-dialog"]')
  await page.getByTestId('ctm-title-input').fill(title)
  await page.getByTestId('ctm-description-input').fill('E2E card-archive')
  await page.getByTestId('ctm-date-input').fill('2026-06-15')
  await page.getByTestId('ctm-hours-input').fill('1')
  await page.getByTestId('ctm-submit-btn').click()
  await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 10_000 })
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 45_000 })
}

test.describe.serial('card-archive E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 15_000 })
  })

  test('happy path: arquivar, lista Arquivados, busca com badge, modal e restaurar', async ({ page }) => {
    test.setTimeout(180_000)
    const taskTitle = uniqTitle('E2E Archive')

    await createCardOnBoard(page, taskTitle)

    const cardOnBoard = page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle }).first()
    await expect(cardOnBoard).toBeVisible({ timeout: 15_000 })
    const cardTestId = await cardOnBoard.getAttribute('data-testid')
    const cardId = cardTestId?.startsWith('card-') ? cardTestId.slice('card-'.length) : ''
    expect(cardId.length).toBeGreaterThan(0)

    page.once('dialog', (d) => {
      expect(d.type()).toBe('confirm')
      void d.accept()
    })

    await cardOnBoard.getByRole('button', { name: 'Arquivar card' }).click()

    await expect(page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle })).toHaveCount(0, {
      timeout: 15_000,
    })

    // Kanban removes the card from the column before `saveDocument` finishes; `/archived` loads from GitHub.
    await expect(page.getByText('Salvando…')).toHaveCount(0, { timeout: 60_000 })

    await page.getByTestId('nav-archived').click()
    await expect(page).toHaveURL(/\/archived$/)
    await expect(page.getByTestId(`archived-row-${cardId}`).getByText(taskTitle, { exact: true })).toBeVisible({
      timeout: 45_000,
    })

    await page.getByRole('button', { name: 'Busca no quadro' }).click()
    await page.waitForSelector('[role="dialog"]')
    const searchInput = page.getByRole('textbox', { name: /Buscar no quadro/i })
    await searchInput.fill(taskTitle)

    const resultBtn = page.getByTestId(`search-result-${cardId}`)
    await expect(resultBtn).toBeVisible({ timeout: 25_000 })
    await expect(page.getByTestId(`search-result-archived-${cardId}`)).toBeVisible()

    await resultBtn.click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')
    await expect(page.getByTestId('ctm-archived-banner')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Editar tarefa' })).toBeVisible()

    await page.getByTestId('ctm-unarchive-btn').click()
    await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 15_000 })

    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 45_000 })
    const cardAgain = page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle }).first()
    await expect(cardAgain).toBeVisible({ timeout: 15_000 })
  })
})
