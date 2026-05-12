import { TurnData } from './match.types'

export interface MatchRules {
  startingScore: number
  doubleIn: boolean
  doubleOut: boolean
  legsToWin: number
}

export interface LegState {
  legNumber: number
  remaining: [number, number]
  currentPlayerIndex: 0 | 1
  startingPlayerIndex: 0 | 1
  turns: TurnData[]
}

export interface MatchState {
  matchId: string
  status: 'active' | 'leg_complete' | 'match_complete'
  players: [string, string]
  currentLeg: LegState
  legsWon: [number, number]
  winnerId: string | null
  rules: MatchRules
}
