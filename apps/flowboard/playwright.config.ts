import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'
import { getAuthStoragePath } from './tests/e2e/auth-storage'

const flowboardRoot = path.dirname(fileURLToPath(import.meta.url))
Object.assign(process.env, loadEnv(process.env.NODE_ENV ?? 'development', flowboardRoot, ''))

/** Caminho absoluto: evita ENOENT se o cwd ao invocar o CLI não for `apps/flowboard`. */
const authStorage = getAuthStoragePath()

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * Um worker por defeito: happy paths (create-task, anexos, arquivo) partilham o mesmo board/repo no GitHub;
   * com `workers` > 1, ficheiros distintos correm em paralelo e o estado corrompe (mesmo padrão que leva
   * a ignorar esses ficheiros em Firefox/WebKit — ver `testIgnore` nos projetos abaixo).
   */
  workers: 1,

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
      testIgnore: [
        /auth\.setup\.ts/,
        /login\.spec\.ts/,
        /create-task\.spec\.ts/,
        /card-attachments\.spec\.ts/,
        /card-archive\.spec\.ts/,
      ],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: authStorage },
      dependencies: ['setup'],
      testIgnore: [
        /auth\.setup\.ts/,
        /login\.spec\.ts/,
        /create-task\.spec\.ts/,
        /card-attachments\.spec\.ts/,
        /card-archive\.spec\.ts/,
      ],
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

  /**
   * Aguarda o proxy Vite (`/api` → BFF) + BFF: só retorna 200 quando ambos estão a ouvir
   * (evita setup E2E falhar com "Falha no login" por BFF ainda a arrancar).
   */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/api/flowboard/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
