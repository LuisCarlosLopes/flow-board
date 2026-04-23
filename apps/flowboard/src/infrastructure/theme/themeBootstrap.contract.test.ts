/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './themeConstants'

const flowboardDir = dirname(fileURLToPath(import.meta.url))
const indexHtmlPath = join(flowboardDir, '../../../index.html')
const themeInitPath = join(flowboardDir, '../../../public/theme-init.js')

describe('theme bootstrap contract (index.html ↔ themeConstants)', () => {
  it('index.html carrega /theme-init.js; script usa THEME_STORAGE_KEY e localStorage', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')
    expect(html).toContain('<script src="/theme-init.js">')
    const js = readFileSync(themeInitPath, 'utf8')
    expect(js).toContain(`var k = '${THEME_STORAGE_KEY}'`)
    expect(js).toContain('localStorage.getItem(k)')
    expect(js).toContain("v === 'light' ? 'light' : 'dark'")
  })
})
