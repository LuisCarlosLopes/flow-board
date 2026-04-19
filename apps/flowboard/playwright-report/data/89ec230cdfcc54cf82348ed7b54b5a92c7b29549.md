# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-task.spec.ts >> CreateTaskModal E2E >> Column "+ Adicionar card" opens modal with matching column id
- Location: tests/e2e/create-task.spec.ts:65:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="board-canvas"]') to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Ir para o conteúdo principal" [ref=e3] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: F
        - generic [ref=e8]: FlowBoard
      - heading "Entrar" [level=1] [ref=e9]
      - paragraph [ref=e10]:
        - text: Conecte um
        - strong [ref=e11]: repositório GitHub privado
        - text: onde os dados serão salvos como JSON. Use um PAT com escopo adequado (tipicamente
        - code [ref=e12]: repo
        - text: para repos privados).
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: URL do repositório
          - textbox "URL do repositório" [ref=e16]:
            - /placeholder: https://github.com/voce/flowboard-data
        - generic [ref=e17]:
          - generic [ref=e18]: Personal Access Token
          - textbox "Personal Access Token" [ref=e19]:
            - /placeholder: ghp_••••••••
        - paragraph [ref=e20]: "O token é um segredo: não compartilhe, não commite em arquivos do repositório de dados e revogue tokens antigos periodicamente."
        - button "Conectar" [ref=e21] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | /**
  4   |  * End-to-end tests for CreateTaskModal feature
  5   |  * Tests complete user flows: create task, validation, copy, cancel, escape
  6   |  */
  7   | 
  8   | test.describe('CreateTaskModal E2E', () => {
  9   |   test.beforeEach(async ({ page }) => {
  10  |     // Navigate to the board page
  11  |     await page.goto('/')
  12  |     // Wait for board to load
> 13  |     await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 10000 })
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  14  |   })
  15  | 
  16  |   test('Happy path: create task with all fields', async ({ page }) => {
  17  |     // Click "Nova tarefa" button
  18  |     const addButton = page.getByTestId('board-add-card')
  19  |     await addButton.click()
  20  | 
  21  |     // Wait for modal to appear
  22  |     await page.waitForSelector('[role="dialog"]')
  23  | 
  24  |     // Fill in title
  25  |     const titleInput = page.getByTestId('ctm-title-input')
  26  |     await titleInput.fill('Implementar autenticação')
  27  | 
  28  |     // Fill in description
  29  |     const descInput = page.getByTestId('ctm-description-input')
  30  |     await descInput.fill('Adicionar login com GitHub OAuth')
  31  | 
  32  |     // Fill in planned date
  33  |     const dateInput = page.getByTestId('ctm-date-input')
  34  |     await dateInput.fill('2026-05-01')
  35  | 
  36  |     // Fill in planned hours
  37  |     const hoursInput = page.getByTestId('ctm-hours-input')
  38  |     await hoursInput.fill('8')
  39  | 
  40  |     // Click copy button to test feedback
  41  |     const copyBtn = page.getByTestId('ctm-copy-btn')
  42  |     await copyBtn.click()
  43  | 
  44  |     // Verify copy feedback appears
  45  |     const feedback = page.locator('text=✓ Copiado!')
  46  |     await expect(feedback).toBeVisible()
  47  | 
  48  |     // Click Create button
  49  |     const submitBtn = page.getByTestId('ctm-submit-btn')
  50  |     await submitBtn.click()
  51  | 
  52  |     // Wait for modal to close
  53  |     await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
  54  | 
  55  |     // Verify task appears in the board
  56  |     const newCard = page.locator('text=Implementar autenticação')
  57  |     await expect(newCard).toBeVisible()
  58  | 
  59  |     // Verify 8h is displayed on card (hours registered)
  60  |     await page.waitForTimeout(500) // Small delay for re-render
  61  |     const cardText = page.locator('[data-testid^="card-"]:has-text("Implementar autenticação")')
  62  |     await expect(cardText).toBeVisible()
  63  |   })
  64  | 
  65  |   test('Column "+ Adicionar card" opens modal with matching column id', async ({ page }) => {
  66  |     await page.goto('/')
  67  |     await page.waitForSelector('[data-testid="board-canvas"]', { timeout: 10000 })
  68  |     const colAddBtn = page.locator('[data-testid^="column-add-card-"]').last()
  69  |     const testId = await colAddBtn.getAttribute('data-testid')
  70  |     const expectedColumnId = testId?.replace('column-add-card-', '') ?? ''
  71  |     expect(expectedColumnId.length).toBeGreaterThan(0)
  72  |     await colAddBtn.click()
  73  |     const dialog = page.getByTestId('ctm-dialog')
  74  |     await expect(dialog).toBeVisible()
  75  |     await expect(dialog).toHaveAttribute('data-default-column-id', expectedColumnId)
  76  |   })
  77  | 
  78  |   test('Validation error: empty title', async ({ page }) => {
  79  |     // Click "Nova tarefa" button
  80  |     const addButton = page.getByTestId('board-add-card')
  81  |     await addButton.click()
  82  | 
  83  |     // Wait for modal
  84  |     await page.waitForSelector('[role="dialog"]')
  85  | 
  86  |     // Leave title empty, fill other fields
  87  |     const descInput = page.getByTestId('ctm-description-input')
  88  |     await descInput.fill('Test Description')
  89  | 
  90  |     const dateInput = page.getByTestId('ctm-date-input')
  91  |     await dateInput.fill('2026-05-01')
  92  | 
  93  |     const hoursInput = page.getByTestId('ctm-hours-input')
  94  |     await hoursInput.fill('5')
  95  | 
  96  |     // Click Create
  97  |     const submitBtn = page.getByTestId('ctm-submit-btn')
  98  |     await submitBtn.click()
  99  | 
  100 |     // Verify error message
  101 |     const errorMsg = page.locator('text=Título é obrigatório')
  102 |     await expect(errorMsg).toBeVisible()
  103 | 
  104 |     // Modal should still be visible
  105 |     const modal = page.locator('[role="dialog"]')
  106 |     await expect(modal).toBeVisible()
  107 | 
  108 |     // Fill title to fix
  109 |     const titleInput = page.getByTestId('ctm-title-input')
  110 |     await titleInput.fill('Valid Title')
  111 | 
  112 |     // Error should disappear
  113 |     await expect(errorMsg).not.toBeVisible()
```