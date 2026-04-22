import { existsSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

/** Playwright roda com `cwd` = `apps/flowboard` — evita `import.meta.url` em runners que transpilam o spec. */
function fixturePath(name: string): string {
  const p = path.join(process.cwd(), 'tests/e2e/fixtures', name)
  if (!existsSync(p)) {
    throw new Error(`Fixture ausente: ${p} (cwd=${process.cwd()})`)
  }
  return p
}

function openCreateTaskFromFirstColumn(page: Page) {
  return page.locator('[data-testid^="column-add-card-"]').first()
}

function uniqTaskTitle(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function fillRequiredTaskFields(page: Page, title: string) {
  await page.getByTestId('ctm-title-input').fill(title)
  await page.getByTestId('ctm-description-input').fill('Descrição E2E anexos.')
  await page.getByTestId('ctm-date-input').fill('2026-06-15')
  await page.getByTestId('ctm-hours-input').fill('1')
}

test.describe.serial('Card attachments E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 10000 })
  })

  test('Happy path: criar tarefa com anexo .md e ver ao editar', async ({ page }) => {
    test.setTimeout(120_000)
    const taskTitle = uniqTaskTitle('Task com MD')
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await fillRequiredTaskFields(page, taskTitle)
    await page.getByTestId('ctm-attachment-input').setInputFiles(fixturePath('hello.md'))

    await expect(page.getByTestId('ctm-attachment-list')).toContainText('hello.md')
    await expect(page.getByTestId('ctm-attachment-list')).toContainText('pendente')

    await page.getByTestId('ctm-submit-btn').click()
    await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 5000 })

    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 45_000 })

    const cardRow = page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle }).first()
    await cardRow.getByRole('button', { name: 'Editar' }).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await expect(page.getByTestId('ctm-attachment-list')).toContainText('hello.md')
    await expect(page.getByTestId('ctm-attachment-list')).not.toContainText('pendente')
  })

  test('Validação: extensão não permitida mostra erro', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await page.getByTestId('ctm-attachment-input').setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('MZ'),
    })

    await expect(page.locator('.fb-ctm__error').filter({ hasText: /não permitido/i })).toBeVisible()
  })

  test('Preview Markdown de anexo pendente', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await page.getByTestId('ctm-attachment-input').setInputFiles(fixturePath('hello.md'))
    await page.getByRole('button', { name: /Pré-visualizar hello\.md/i }).click()

    const preview = page.getByTestId('ctm-attachment-preview')
    await expect(preview).toBeVisible()
    await expect(preview.getByText('E2E attachment', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(preview.getByText('Item one', { exact: true })).toBeVisible()
  })

  test('Happy path: anexo .jpg e preview de imagem', async ({ page }) => {
    test.setTimeout(120_000)
    const taskTitle = uniqTaskTitle('Task com JPG')
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await fillRequiredTaskFields(page, taskTitle)
    await page.getByTestId('ctm-attachment-input').setInputFiles(fixturePath('tiny.jpg'))

    await expect(page.getByTestId('ctm-attachment-list')).toContainText('tiny.jpg')

    await page.getByRole('button', { name: /Pré-visualizar tiny\.jpg/i }).click()
    const preview = page.getByTestId('ctm-attachment-preview')
    await expect(preview.locator('img.fb-ctm__preview-img')).toBeVisible()

    await page.getByTestId('ctm-submit-btn').click()
    await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 5000 })
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 45_000 })
  })

  test('Download de anexo após salvar (card editado)', async ({ page }) => {
    test.setTimeout(120_000)
    const taskTitle = uniqTaskTitle('Task download MD')
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    await fillRequiredTaskFields(page, taskTitle)
    await page.getByTestId('ctm-attachment-input').setInputFiles(fixturePath('hello.md'))
    await page.getByTestId('ctm-submit-btn').click()
    await page.waitForSelector('[data-testid="ctm-dialog"]', { state: 'hidden', timeout: 5000 })

    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 45_000 })

    const cardRow = page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle }).first()
    await cardRow.getByRole('button', { name: 'Editar' }).click()
    await page.waitForSelector('[data-testid="ctm-dialog"]')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Baixar.*hello\.md/i }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/hello\.md/i)
  })
})
