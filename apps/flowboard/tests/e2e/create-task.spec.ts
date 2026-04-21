import { test, expect, type Page } from '@playwright/test'

/**
 * End-to-end tests for CreateTaskModal feature
 * Tests complete user flows: create task, validation, copy, cancel, escape
 */

function openCreateTaskFromFirstColumn(page: Page) {
  return page.locator('[data-testid^="column-add-card-"]').first()
}

/** Evita colisões entre workers paralelos no mesmo repositório GitHub de E2E. */
function uniqTaskTitle(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

test.describe.serial('CreateTaskModal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the board page
    await page.goto('/')
    // Wait for board to load
    await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 10000 })
  })

  test('Happy path: create task with all fields', async ({ page }) => {
    test.setTimeout(120_000)
    const taskTitle = uniqTaskTitle('Implementar autenticação')
    await openCreateTaskFromFirstColumn(page).click()

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]')

    // Fill in title
    const titleInput = page.getByTestId('ctm-title-input')
    await titleInput.fill(taskTitle)

    // Fill in description
    const descInput = page.getByTestId('ctm-description-input')
    await descInput.fill('Adicionar login com GitHub OAuth')

    // Fill in planned date
    const dateInput = page.getByTestId('ctm-date-input')
    await dateInput.fill('2026-05-01')

    // Fill in planned hours
    const hoursInput = page.getByTestId('ctm-hours-input')
    await hoursInput.fill('8')

    // Click copy button to test feedback
    const copyBtn = page.getByTestId('ctm-copy-btn')
    await copyBtn.click()

    // Verify copy feedback appears
    const feedback = page.locator('.fb-ctm__copy-feedback')
    await expect(feedback).toHaveText('✓ Copiado!')

    // Click Create button
    const submitBtn = page.getByTestId('ctm-submit-btn')
    await submitBtn.click()

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })

    // Verify task appears on the board (persistência GitHub pode levar vários segundos)
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 45_000 })

    const cardText = page.locator('[data-testid^="card-"]').filter({ hasText: taskTitle }).first()
    await expect(cardText).toBeVisible({ timeout: 15_000 })
  })

  test('Column "+ Adicionar card" opens modal with matching column id', async ({ page }) => {
    const colAddBtn = page.locator('[data-testid^="column-add-card-"]').last()
    const testId = await colAddBtn.getAttribute('data-testid')
    const expectedColumnId = testId?.replace('column-add-card-', '') ?? ''
    expect(expectedColumnId.length).toBeGreaterThan(0)
    await colAddBtn.click()
    const dialog = page.getByTestId('ctm-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('data-default-column-id', expectedColumnId)
  })

  test('Board settings → Colunas opens column editor', async ({ page }) => {
    await page.getByTestId('board-settings-trigger').click()
    await expect(page.locator('#board-settings-menu')).toBeVisible()
    await page.getByTestId('board-edit-columns').click()
    const colEditor = page.getByTestId('column-editor-dialog')
    await expect(colEditor).toBeVisible()
    await expect(colEditor.getByRole('heading', { name: 'Colunas do quadro' })).toBeVisible()
    await colEditor.getByRole('button', { name: 'Cancelar' }).click()
    await expect(colEditor).toBeHidden()
  })

  test('Validation error: empty title', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    // Wait for modal
    await page.waitForSelector('[role="dialog"]')

    // Leave title empty, fill other fields
    const descInput = page.getByTestId('ctm-description-input')
    await descInput.fill('Test Description')

    const dateInput = page.getByTestId('ctm-date-input')
    await dateInput.fill('2026-05-01')

    const hoursInput = page.getByTestId('ctm-hours-input')
    await hoursInput.fill('5')

    // Click Create
    const submitBtn = page.getByTestId('ctm-submit-btn')
    await submitBtn.click()

    // Verify error message
    const errorMsg = page.locator('text=Título é obrigatório')
    await expect(errorMsg).toBeVisible()

    // Modal should still be visible
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Fill title to fix
    const titleInput = page.getByTestId('ctm-title-input')
    await titleInput.fill(uniqTaskTitle('Valid Title'))

    // Error should disappear
    await expect(errorMsg).not.toBeVisible()

    // Click Create again
    await submitBtn.click()

    // Modal should close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  })

  test('Validation error: negative hours', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Fill all fields
    const titleInput = page.getByTestId('ctm-title-input')
    await titleInput.fill('Task Title')

    const descInput = page.getByTestId('ctm-description-input')
    await descInput.fill('Task Description')

    const dateInput = page.getByTestId('ctm-date-input')
    await dateInput.fill('2026-05-01')

    // Set negative hours (`min="0"` no input impede -5 via fill sem remover o atributo)
    const hoursInput = page.getByTestId('ctm-hours-input')
    await hoursInput.evaluate((el) => (el as HTMLInputElement).removeAttribute('min'))
    await hoursInput.fill('-5')

    // Click Create
    const submitBtn = page.getByTestId('ctm-submit-btn')
    await submitBtn.click()

    // Verify error
    const errorMsg = page.locator('text=Horas deve ser um número ≥ 0')
    await expect(errorMsg).toBeVisible()

    // Modal remains open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
  })

  test('Cancel button closes modal without saving', async ({ page }) => {
    const tempTitle = uniqTaskTitle('Temporary Task')
    // Get initial card count
    const initialCards = await page.locator('[data-testid^="card-"]').count()

    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Fill form partially
    const titleInput = page.getByTestId('ctm-title-input')
    await titleInput.fill(tempTitle)

    // Click Cancel
    const cancelBtn = page.getByTestId('ctm-cancel-btn')
    await cancelBtn.click()

    // Modal should close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    // Card count should not change
    const finalCards = await page.locator('[data-testid^="card-"]').count()
    expect(finalCards).toBe(initialCards)

    await expect(page.getByText(tempTitle, { exact: true })).toHaveCount(0)
  })

  test('Escape key closes modal', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  })

  test('Copy button feedback', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Copy button should be disabled when description is empty
    const copyBtn = page.getByTestId('ctm-copy-btn')
    await expect(copyBtn).toBeDisabled()

    // Fill description
    const descInput = page.getByTestId('ctm-description-input')
    await descInput.fill('This is a test description')

    // Copy button should now be enabled
    await expect(copyBtn).toBeEnabled()

    // Click copy
    await copyBtn.click()

    const feedback = page.locator('.fb-ctm__copy-feedback')
    await expect(feedback).toHaveText('✓ Copiado!')

    await expect(feedback).toBeHidden({ timeout: 3000 })

    // Button text should revert
    await expect(copyBtn).toContainText('Copiar')
  })

  test('Form field constraints', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Test title max length (200 chars)
    const titleInput = page.getByTestId('ctm-title-input')
    const longTitle = 'a'.repeat(300)
    await titleInput.fill(longTitle)

    // Verify truncation at 200
    const titleValue = await titleInput.inputValue()
    expect(titleValue.length).toBeLessThanOrEqual(200)

    // Test hours field accepts decimals
    const hoursInput = page.getByTestId('ctm-hours-input')
    await hoursInput.fill('3.5')
    const hoursValue = await hoursInput.inputValue()
    expect(hoursValue).toBe('3.5')

    // Test date field has type="date"
    const dateInput = page.getByTestId('ctm-date-input')
    await expect(dateInput).toHaveAttribute('type', 'date')
  })

  test('Created At field displays today\'s date', async ({ page }) => {
    await openCreateTaskFromFirstColumn(page).click()

    await page.waitForSelector('[role="dialog"]')

    // Get today's date in pt-BR format
    const today = new Date().toLocaleDateString('pt-BR')

    // Verify Created At displays current date
    const createdAtField = page.getByTestId('ctm-created-at')
    const fieldText = await createdAtField.textContent()
    expect(fieldText).toContain(today.split('/')[0]) // At least day should match
  })

  test('Modal resets form on reopen', async ({ page }) => {
    let addButton = openCreateTaskFromFirstColumn(page)
    await addButton.click()

    await page.waitForSelector('[role="dialog"]')

    // Fill form
    const titleInput = page.getByTestId('ctm-title-input')
    await titleInput.fill(uniqTaskTitle('First Task'))

    const descInput = page.getByTestId('ctm-description-input')
    await descInput.fill('First Description')

    // Close with Cancel
    const cancelBtn = page.getByTestId('ctm-cancel-btn')
    await cancelBtn.click()

    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    // Reopen modal
    addButton = openCreateTaskFromFirstColumn(page)
    await addButton.click()

    await page.waitForSelector('[role="dialog"]')

    // Verify form is empty
    const newTitleInput = page.getByTestId('ctm-title-input')
    const titleValue = await newTitleInput.inputValue()
    expect(titleValue).toBe('')

    const newDescInput = page.getByTestId('ctm-description-input')
    const descValue = await newDescInput.inputValue()
    expect(descValue).toBe('')

    const t = new Date()
    const todayIso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const dateValue = await page.getByTestId('ctm-date-input').inputValue()
    expect(dateValue).toBe(todayIso)
  })

  test('Edit task: same modal with heading and save', async ({ page }) => {
    test.setTimeout(120_000)
    const titleBefore = uniqTaskTitle('Task Before Edit')
    const titleAfter = uniqTaskTitle('Task After Edit')
    await openCreateTaskFromFirstColumn(page).click()
    await page.waitForSelector('[role="dialog"]')

    await page.getByTestId('ctm-title-input').fill(titleBefore)
    await page.getByTestId('ctm-description-input').fill('Desc original')
    await page.getByTestId('ctm-date-input').fill('2026-06-01')
    await page.getByTestId('ctm-hours-input').fill('2')
    await page.getByTestId('ctm-submit-btn').click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    await expect(page.getByText(titleBefore, { exact: true }).first()).toBeVisible({ timeout: 45_000 })

    const cardRow = page.locator('[data-testid^="card-"]').filter({ hasText: titleBefore }).first()
    await cardRow.getByRole('button', { name: 'Editar' }).click()

    await page.waitForSelector('[role="dialog"]')
    await expect(page.getByRole('heading', { name: 'Editar tarefa' })).toBeVisible()
    await expect(page.getByTestId('ctm-submit-btn')).toContainText('Salvar')

    await page.getByTestId('ctm-title-input').fill(titleAfter)
    await page.getByTestId('ctm-submit-btn').click()
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })

    await expect(page.getByText(titleAfter, { exact: true }).first()).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(titleBefore, { exact: true })).toHaveCount(0)
  })
})
