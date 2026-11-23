import { create } from 'zustand'

type Theme = 'dark' | 'light'

function apply(theme: Theme) {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
}

function initial(): Theme {
    const saved = localStorage.getItem('theme')
    const theme: Theme = saved === 'light' ? 'light' : 'dark'
    apply(theme)
    return theme
}

interface ThemeStore {
    theme: Theme
    toggle: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
    theme: initial(),
    toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        apply(next)
        set({ theme: next })
    },
}))
