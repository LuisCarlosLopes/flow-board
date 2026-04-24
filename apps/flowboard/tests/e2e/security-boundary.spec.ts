import { test, expect } from '@playwright/test'

test.describe('FlowBoard security boundary', () => {
  test('uses same-origin /api routes instead of direct browser calls to api.github.com', async ({ page }) => {
    const browserRequests: { url: string; authorization?: string }[] = []

    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/flowboard/contents') || url.startsWith('https://api.github.com')) {
        browserRequests.push({
          url,
          authorization: request.headers().authorization,
        })
      }
    })

    await page.goto('/')
    await expect(page.getByTestId('board-canvas')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('board-canvas')).toBeVisible()

    expect(browserRequests.some((request) => request.url.includes('/api/flowboard/contents'))).toBeTruthy()
    expect(browserRequests.some((request) => request.url.startsWith('https://api.github.com'))).toBeFalsy()
    expect(browserRequests.some((request) => typeof request.authorization === 'string')).toBeFalsy()
  })
})
