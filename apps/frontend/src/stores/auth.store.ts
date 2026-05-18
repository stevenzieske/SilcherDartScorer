import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
    pin: string
    setPin: (pin: string) => void
    clearPin: () => void
    isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            pin: '',
            setPin: (pin) => set({ pin }),
            clearPin: () => set({ pin: '' }),
            isAdmin: () => get().pin.length > 0,
        }),
        { name: 'auth' }
    )
)
