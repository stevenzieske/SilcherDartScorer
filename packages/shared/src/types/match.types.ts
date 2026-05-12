import { MatchStatus, MatchEventType } from './enums'

export interface DartThrow {
  notation: string
  score: number
}

export interface TurnData {
  playerId: string
  legNumber: number
  darts: DartThrow[]
  turnScore: number
  remainingBefore: number
  remainingAfter: number
  isBust: boolean
  isCheckout: boolean
}

export interface Match {
  _id: string
  tournamentId: string
  roundNumber: number
  slotIndex: number
  board: number | null
  status: MatchStatus
  players: [string, string]
  currentLegNumber: number
  legsWon: [number, number]
  winnerId: string | null
  judgeId: string | null
  startedAt: string | null
  endedAt: string | null
}

export interface MatchEvent {
  _id: string
  matchId: string
  legNumber: number
  sequence: number
  type: MatchEventType
  actorId: string
  data: TurnData | { winnerId: string } | null
  timestamp: string
}
