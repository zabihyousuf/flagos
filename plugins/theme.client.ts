const STORAGE_KEY = 'flagos-theme'

function applyTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  const preference = stored === 'light' || stored === 'dark' ? stored : 'system'
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}

applyTheme()
