import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from './themeConstants'
import { applyThemeToDocument, readTheme, writeTheme } from './themeStore'

describe('themeStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('returns dark when storage is empty', () => {
    expect(readTheme()).toBe('dark')
  })

  it('returns dark for invalid stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'nope')
    expect(readTheme()).toBe('dark')
  })

  it('reads light and dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(readTheme()).toBe('light')
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readTheme()).toBe('dark')
  })

  it('writeTheme persists', () => {
    writeTheme('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('readTheme returns dark when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined as unknown as Storage)
    expect(readTheme()).toBe('dark')
  })

  it('writeTheme is no-op when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined as unknown as Storage)
    expect(() => writeTheme('light')).not.toThrow()
  })

  it('applyThemeToDocument sets data-theme', () => {
    applyThemeToDocument('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyThemeToDocument('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
