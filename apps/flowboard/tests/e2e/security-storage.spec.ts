import { test, expect } from '@playwright/test'

test.describe('FlowBoard security storage', () => {
  test('does not persist PAT or secret session fields in browser storage', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByTestId('board-canvas')).toBeVisible()

    const storageSnapshot = await page.evaluate(() => ({
      local: Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!
        return [key, localStorage.getItem(key)]
      })),
      session: Object.fromEntries(Array.from({ length: sessionStorage.length }, (_, index) => {
        const key = sessionStorage.key(index)!
        return [key, sessionStorage.getItem(key)]
      })),
    }))

    const localSession = storageSnapshot.local['flowboard.session.v1']
    expect(localSession).toBeTruthy()
    expect(localSession).not.toContain('"pat"')
    expect(localSession).not.toContain('"apiBase"')
    expect(JSON.stringify(storageSnapshot.session)).not.toContain('ghp_')

    const storageState = await context.storageState()
    const serialized = JSON.stringify(storageState)
    expect(serialized).not.toContain('ghp_')
    expect(serialized).not.toContain('"pat"')
    expect(serialized).not.toContain('"apiBase"')
  })
})
