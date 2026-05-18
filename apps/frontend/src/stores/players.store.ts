import { create } from 'zustand'
import type { Player } from '@dart/shared'

interface PlayersStore {
    players: Player[]
    setPlayers: (players: Player[]) => void
    getName: (id: string) => string
}

export const usePlayersStore = create<PlayersStore>((set, get) => ({
    players: [],
    setPlayers: (players) => set({ players }),
    getName: (id) => get().players.find(p => p._id === id)?.name ?? id,
}))
