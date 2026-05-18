import { create } from 'zustand'
import type { BracketRound, LeagueStanding, Tournament } from "@dart/shared";

interface TournamentStore {
    tournaments: Tournament[]
    activeTournament: Tournament | null
    setTournaments: (tournaments: Tournament[]) => void
    setActiveTournament: (tournament: Tournament | null) => void
    updateStandings: (standings: LeagueStanding[]) => void
    updateKnockoutRounds: (rounds: BracketRound[]) => void
}

export const useTournamentStore = create<TournamentStore>()((set) => ({
    tournaments: [],
    activeTournament: null,
    setTournaments: (tournaments) => set({ tournaments }),
    setActiveTournament: (tournament) => set({ activeTournament: tournament }),
    updateStandings: (standings) =>
        set(state => ({
            activeTournament: state.activeTournament
                ? { ...state.activeTournament, standings }
                : null,
        })),
    updateKnockoutRounds: (knockoutRounds) =>
        set(state => ({
            activeTournament: state.activeTournament
                ? { ...state.activeTournament, knockoutRounds }
                : null,
        })),
}))
