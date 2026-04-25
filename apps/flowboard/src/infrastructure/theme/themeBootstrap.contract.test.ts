/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './themeConstants'

const flowboardDir = dirname(fileURLToPath(import.meta.url))
const indexHtmlPath = join(flowboardDir, '../../../index.html')
const bootstrapJsPath = join(flowboardDir, '../../../public/theme-bootstrap.js')

describe('theme bootstrap contract (index.html ↔ themeConstants)', () => {
  it('loads external theme bootstrap script with the same storage key contract', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')
    const bootstrap = readFileSync(bootstrapJsPath, 'utf8')
    expect(html).toContain('<script src="/theme-bootstrap.js"></script>')
    expect(bootstrap).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(bootstrap).toContain('localStorage.getItem(key)')
    expect(bootstrap).toContain("value === 'light' ? 'light' : 'dark'")
  })
})
