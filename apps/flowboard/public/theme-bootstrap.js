(() => {
  try {
    const key = 'flowboard-theme'
    const value = localStorage.getItem(key)
    document.documentElement.dataset.theme = value === 'light' ? 'light' : 'dark'
  } catch {
    document.documentElement.dataset.theme = 'dark'
  }
})()
