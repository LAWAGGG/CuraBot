const KEY = 'curabot:settings'

const DEFAULTS = { theme: 'light', fontSize: 16 }

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function applySettings(settings = getSettings()) {
  document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  document.documentElement.style.fontSize = `${settings.fontSize}px`
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  applySettings(next)
  return next
}
