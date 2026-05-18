import { TurnData } from './match.types'

export interface MatchRules {
  startingScore: number
  doubleIn: boolean
  doubleOut: boolean
  legsToWin: number
  setsToWin?: number  // 0 or undefined = legs-only mode
}

export interface LegState {
  legNumber: number
  remaining: number[]
  currentPlayerIndex: number
  startingPlayerIndex: number
  turns: TurnData[]
}

export interface MatchState {
  matchId: string
  status: 'active' | 'leg_complete' | 'match_complete'
  players: string[]
  currentLeg: LegState
  previousLegs: LegState[]
  legsWon: number[]
  legsWonInSet: number[]
  setsWon: number[]
  winnerId: string | null
  rules: MatchRules
}
