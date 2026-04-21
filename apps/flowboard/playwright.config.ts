import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'
import { getAuthStoragePath } from './tests/e2e/auth-storage'

const flowboardRoot = path.dirname(fileURLToPath(import.meta.url))
Object.assign(process.env, loadEnv(process.env.NODE_ENV ?? 'development', flowboardRoot, ''))

/** Caminho absoluto: evita ENOENT se o cwd ao invocar o CLI não for `apps/flowboard`. */
const authStorage = getAuthStoragePath()

/** Com janela visível, vários workers competem por foco e o clipboard falha com frequência. */
const headedOrInteractive = ['--headed', '--debug', '--ui'].some((flag) => process.argv.includes(flag))

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: (!!process.env.CI || headedOrInteractive) ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL: process.env.FLOWBOARD_E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStorage,
        /** Só Chromium expõe clipboard-read/write no Playwright; demais browsers usam fallback do hook. */
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /login\.spec\.ts/],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: authStorage },
      dependencies: ['setup'],
      // create-task grava no mesmo repo GitHub: paralelizar entre browsers corrompe o estado
      testIgnore: [/auth\.setup\.ts/, /login\.spec\.ts/, /create-task\.spec\.ts/],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: authStorage },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /login\.spec\.ts/, /create-task\.spec\.ts/],
    },
    {
      name: 'chromium-login',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testMatch: /login\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
