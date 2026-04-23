/* Sync with THEME_STORAGE_KEY in src/infrastructure/theme/themeConstants.ts */
(function () {
  try {
    var k = 'flowboard-theme'
    var v = localStorage.getItem(k)
    document.documentElement.dataset.theme = v === 'light' ? 'light' : 'dark'
  } catch (e) {
    document.documentElement.dataset.theme = 'dark'
  }
})()
