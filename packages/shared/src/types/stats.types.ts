import { CareerStats, Player } from './player.types'

export interface TournamentHistoryEntry {
  tournamentId: string
  tournamentName: string
  placement: number
  matchesPlayed: number
  matchesWon: number
  date: string
}

export interface PlayerStatsResponse {
  player: Player
  careerStats: CareerStats
  tournamentHistory: TournamentHistoryEntry[]
}

export interface TopPerformer {
  playerId: string
  playerName: string
  averageTurnScore: number
  oneEighties: number
  highestCheckout: number
}

export interface TournamentStatsResponse {
  tournamentId: string
  tournamentName: string
  totalMatches: number
  averageTurnScore: number
  topPerformers: TopPerformer[]
}
