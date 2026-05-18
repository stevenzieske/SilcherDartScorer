import { create } from 'zustand'
import type { MatchState, DartInProgressData } from '@dart/shared'

interface MatchStore {
    matchState: MatchState | null
    inProgress: DartInProgressData | null
    setMatchState: (state: MatchState) => void
    setInProgress: (data: DartInProgressData | null) => void
    clearMatch: () => void
}

export const useMatchStore = create<MatchStore>()((set) => ({
    matchState: null,
    inProgress: null,
    setMatchState: (matchState) => set({ matchState, inProgress: null }),
    setInProgress: (inProgress) => set({ inProgress }),
    clearMatch: () => set({ matchState: null, inProgress: null }),
}))
