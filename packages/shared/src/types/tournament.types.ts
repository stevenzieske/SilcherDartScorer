import { TournamentStatus, TournamentPhase } from './enums'

export interface TournamentRules {
  startingScore: 301 | 501 | 701
  doubleIn: boolean
  doubleOut: boolean
  groupLegsToWin: number      // league phase — typically 2 (first to 2 legs)
  knockoutLegsToWin: number   // knockout phase — typically 3, configurable to 2
  boardCount: number
  knockoutSize: 4 | 8         // how many players advance from league to knockout
  matchesPerPlayer: number    // target number of league matches per player
}

// ─── League phase ────────────────────────────────────────────────────────────

export interface LeagueStanding {
  playerId: string
  played: number
  won: number
  lost: number
  points: number              // 2 per win, 0 per loss
  legsWon: number
  legsLost: number
  legDifference: number       // legsWon - legsLost
  average: number             // average score per visit across all league matches
}

export interface ScheduledMatch {
  matchOrder: number          // position in the queue for this round (1-based)
  matchId: string             // set after Match document is created; '' initially
}

export interface LeagueRound {
  roundNumber: number         // 1, 2, or 3
  matches: ScheduledMatch[]   // ordered queue — next pending match is assigned to the next free board
}

// ─── Knockout phase ───────────────────────────────────────────────────────────

export interface BracketSlot {
  slotIndex: number
  matchId: string | null
  player1: string | 'BYE' | 'TBD'
  player2: string | 'BYE' | 'TBD'
  winnerId: string | null
  loserId: string | null      // needed to route losers to consolation matches
  isBye: boolean
  playsFor: number | null     // 1 = Final, 3 = 3rd place, 5 = 5th place, etc.
}

export interface BracketRound {
  roundNumber: number
  roundName: string           // 'Quarter-Finals', 'Semi-Finals', 'Final', '3rd Place', etc.
  bracketSide: 'winners' | 'consolation'
  slots: BracketSlot[]
}

// ─── Tournament ───────────────────────────────────────────────────────────────

export interface Tournament {
  _id: string
  name: string
  status: TournamentStatus
  phase: TournamentPhase
  rules: TournamentRules
  players: string[]           // all player IDs in draw order
  leagueRounds: LeagueRound[] // exactly 3 rounds, schedule generated at tournament start
  standings: LeagueStanding[] // updated live after every league match
  knockoutRounds: BracketRound[]  // populated when league phase ends
  placements: Record<string, number>  // playerId → final place (1, 2, 3…), set at tournament end
  createdAt: string
  startedAt?: string
  completedAt?: string
}
