/** Keep in sync with public/theme-init.js and index.html */
export const THEME_STORAGE_KEY = 'flowboard-theme' as const

export type ThemeMode = 'dark' | 'light'

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}
