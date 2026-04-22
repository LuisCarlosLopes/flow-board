import { isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from './themeConstants'

const DEFAULT_THEME: ThemeMode = 'dark'

export function readTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_THEME
  }
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(raw)) {
      return raw
    }
    return DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function writeTheme(mode: ThemeMode): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* private mode / quota */
  }
}

export function applyThemeToDocument(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
}
