import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be blocked; the choice then lasts for this visit only.
    }
    setDark(next)
  }

  const Icon = dark ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

export default ThemeToggle