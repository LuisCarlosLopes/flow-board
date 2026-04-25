/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './themeConstants'

const flowboardDir = dirname(fileURLToPath(import.meta.url))
const indexHtmlPath = join(flowboardDir, '../../../index.html')
const themeInitPath = join(flowboardDir, '../../../public/theme-init.js')

describe('theme bootstrap contract (public/theme-init.js ↔ themeConstants)', () => {
  it('index carrega theme-init.js; script usa THEME_STORAGE_KEY e localStorage', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')
    expect(html).toContain('/theme-init.js')
    const script = readFileSync(themeInitPath, 'utf8')
    expect(script).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(script).toContain('localStorage.getItem(k)')
    expect(script).toContain("v === 'light' ? 'light' : 'dark'")
  })
})
