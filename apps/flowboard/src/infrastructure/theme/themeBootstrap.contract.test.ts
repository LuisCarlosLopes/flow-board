/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './themeConstants'

const flowboardDir = dirname(fileURLToPath(import.meta.url))
const indexHtmlPath = join(flowboardDir, '../../../index.html')

describe('theme bootstrap contract (index.html ↔ themeConstants)', () => {
  it('inline script assigns k with THEME_STORAGE_KEY and reads theme via getItem(k)', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')
    expect(html).toContain(`var k = '${THEME_STORAGE_KEY}'`)
    expect(html).toContain('localStorage.getItem(k)')
    expect(html).toContain("v === 'light' ? 'light' : 'dark'")
  })
})
