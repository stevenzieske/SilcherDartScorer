import { MatchStatus, MatchEventType } from './enums'

export interface DartThrow {
  notation: string   // 'T20', 'D16', '25', 'BULL', 'MISS', '0'
  score: number      // T20=60, D16=32, BULL=50, MISS=0
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
  tournamentId: string | null
  leagueRound: number | null  // 1, 2, or 3 for league phase matches — null for knockout
  roundNumber: number | null  // knockout bracket round number — null for league matches
  slotIndex: number | null    // knockout bracket slot index — null for league matches
  board: number | null
  status: MatchStatus
  players: string[]
  currentLegNumber: number
  legsWon: number[]
  setsWon: number[]
  winnerId: string | null
  judgeId: string | null
  startedAt: string | null
  endedAt: string | null
  startingPlayerIndex: number
  isQuickMatch: boolean
  ruleStartingScore: number | null
  ruleDoubleIn: boolean | null
  ruleDoubleOut: boolean | null
  ruleLegsToWin: number | null
  ruleSetsToWin: number | null
}

// Emitted via socket after each individual dart — never stored in DB.
// Spectators see every dart live; if the client reconnects it gets the last full MatchState instead.
export interface DartInProgressData {
  matchId: string
  playerId: string
  legNumber: number
  dartIndex: number        // 0-based: 0 = first dart of the turn
  dart: DartThrow          // the dart just thrown
  dartsThrown: DartThrow[] // all darts in this turn so far (includes current)
  runningScore: number     // sum of dartsThrown scores
  runningRemaining: number // remainingBefore - runningScore (may be negative — client shows bust warning)
}

export interface MatchEvent {
  _id: string
  matchId: string
  legNumber: number
  sequence: number            // monotonic per match — critical for undo + rebuild
  type: MatchEventType
  actorId: string             // judgeId or 'system'
  data: TurnData | { winnerId: string } | null
  timestamp: string
}
