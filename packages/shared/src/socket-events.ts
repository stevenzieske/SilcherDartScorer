import { MatchState } from './types/match-engine.types'
import { DartInProgressData, MatchEvent } from './types/match.types'
import { Player } from './types/player.types'
import { BracketRound, LeagueStanding } from './types/tournament.types'

export const EVENTS = {
  // Client → Server
  SUBSCRIBE_TOURNAMENT: 'subscribe:tournament',
  SUBSCRIBE_MATCH:      'subscribe:match',
  SUBSCRIBE_BOARD:      'subscribe:board',
  DART_THROWN:          'dart:thrown',          // judge emits after each individual dart entry

  // Server → Client — match
  MATCH_STATE:          'match:state',
  MATCH_EVENT:          'match:event',
  MATCH_STARTED:        'match:started',
  MATCH_ENDED:          'match:ended',
  BOARD_UPDATED:        'board:updated',
  DART_IN_PROGRESS:     'dart:in_progress',     // broadcast per dart — ephemeral, never stored in DB

  // Server → Client — tournament
  LEAGUE_STANDINGS:     'league:standings',     // full standings after every league match
  LEAGUE_ROUND_COMPLETE:'league:round_complete', // all matches in a league round finished
  PHASE_CHANGED:        'phase:changed',         // league → knockout transition
  KNOCKOUT_BRACKET:     'knockout:bracket',      // full BracketRound[] after any KO advancement
} as const

export interface ServerToClientEvents {
  [EVENTS.MATCH_STATE]:           (state: MatchState) => void
  [EVENTS.MATCH_EVENT]:           (event: MatchEvent) => void
  [EVENTS.MATCH_STARTED]:         (data: { matchId: string; board: number; players: Player[] }) => void
  [EVENTS.MATCH_ENDED]:           (data: { matchId: string; winnerId: string }) => void
  [EVENTS.BOARD_UPDATED]:         (data: { board: number; matchId: string; state: MatchState }) => void
  [EVENTS.DART_IN_PROGRESS]:      (data: DartInProgressData) => void
  [EVENTS.LEAGUE_STANDINGS]:      (standings: LeagueStanding[]) => void
  [EVENTS.LEAGUE_ROUND_COMPLETE]: (data: { roundNumber: number; standings: LeagueStanding[] }) => void
  [EVENTS.PHASE_CHANGED]:         (data: { phase: 'knockout'; knockoutRounds: BracketRound[] }) => void
  [EVENTS.KNOCKOUT_BRACKET]:      (rounds: BracketRound[]) => void
}

export interface ClientToServerEvents {
  [EVENTS.SUBSCRIBE_TOURNAMENT]: (tournamentId: string) => void
  [EVENTS.SUBSCRIBE_MATCH]:      (matchId: string) => void
  [EVENTS.SUBSCRIBE_BOARD]:      (board: number) => void
  [EVENTS.DART_THROWN]:          (data: { matchId: string; notation: string }) => void
}
