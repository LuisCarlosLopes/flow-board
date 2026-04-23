import { test, expect, type Page } from '@playwright/test'

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
  await page.getByTestId('ctm-description-input').fill('E2E hours-view')
  await page.getByTestId('ctm-date-input').fill('2026-06-15')
  await page.getByTestId('ctm-hours-input').fill('1')
  await page.getByTestId('ctm-submit-btn').click()
  await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 10_000 })
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 45_000 })
}

test.describe('HoursView smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 15_000 })
  })

  test('navega para Horas e exibe a vista', async ({ page }) => {
    await page.getByTestId('nav-hours').click()
    await expect(page.getByTestId('hours-view')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Horas no período' })).toBeVisible()
  })
})

test.describe.serial('HoursView E2 — modal fecha ao mudar contexto', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Mutação no GitHub compartilhado: alinhar a create-task/card-archive (Chromium).')
    await page.goto('/')
    await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 15_000 })
  })

  test('E2: alterar período (Dia/Semana) com modal aberta fecha o diálogo', async ({ page }) => {
    test.setTimeout(180_000)
    const title = uniqTitle('E2E Horas contexto')
    await createCardOnBoard(page, title)

    const cardOnBoard = page.locator('[data-testid^="card-"]').filter({ hasText: title }).first()
    await expect(cardOnBoard).toBeVisible({ timeout: 15_000 })
    const cardTestId = await cardOnBoard.getAttribute('data-testid')
    const cardId = cardTestId?.startsWith('card-') ? cardTestId.slice('card-'.length) : ''
    expect(cardId.length).toBeGreaterThan(0)

    const addAttr = await page.locator('[data-testid^="column-add-card-"]').first().getAttribute('data-testid')
    const todoColId = addAttr?.replace('column-add-card-', '') ?? ''
    expect(todoColId).toContain(':')
    const workColId = todoColId.replace(/:todo$/, ':work')
    const doneColId = todoColId.replace(/:todo$/, ':done')

    const cardLoc = page.getByTestId(`card-${cardId}`)
    await cardLoc.dragTo(page.getByTestId(`column-${workColId}`), { timeout: 30_000 })
    await expect(page.getByTestId('board-page-saving')).toHaveCount(0, { timeout: 60_000 })
    await cardLoc.dragTo(page.getByTestId(`column-${doneColId}`), { timeout: 30_000 })
    await expect(page.getByTestId('board-page-saving')).toHaveCount(0, { timeout: 60_000 })

    await page.getByTestId('nav-hours').click()
    await expect(page.getByTestId('hours-view')).toBeVisible()

    const editBtn = page.getByTestId('hours-row-edit').first()
    await expect(editBtn).toBeVisible({ timeout: 45_000 })
    await editBtn.click()
    await expect(page.getByTestId('hours-edit-modal')).toBeVisible()

    await page.getByTestId('hours-period-day').click()
    await expect(page.getByTestId('hours-edit-modal')).toBeHidden()
  })
})
