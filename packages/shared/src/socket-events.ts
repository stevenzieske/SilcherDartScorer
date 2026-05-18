import { MatchState } from './types/match-engine.types'
import { DartInProgressData, MatchEvent } from './types/match.types'
import { BracketRound, LeagueStanding } from './types/tournament.types'

export const EVENTS = {
  // Client → Server
  SUBSCRIBE_TOURNAMENT:  'subscribe:tournament',
  SUBSCRIBE_MATCH:       'subscribe:match',
  SUBSCRIBE_BOARD:       'subscribe:board',
  SUBSCRIBE_JUDGES:      'subscribe:judges',
  DART_THROWN:           'dart:thrown',
  JUDGE_CLAIM_MATCH:     'judge:claim',
  JUDGE_RELEASE_MATCH:   'judge:release',

  // Server → Client — match
  MATCH_STATE:           'match:state',
  MATCH_EVENT:           'match:event',
  MATCH_STARTED:         'match:started',
  MATCH_ENDED:           'match:ended',
  MATCH_RESET:           'match:reset',
  BOARD_UPDATED:         'board:updated',
  DART_IN_PROGRESS:      'dart:in_progress',

  // Server → Client — judges
  JUDGE_CLAIMS_UPDATED:  'judge:claims_updated',

  // Server → Client — tournament
  LEAGUE_STANDINGS:      'league:standings',
  LEAGUE_ROUND_COMPLETE: 'league:round_complete',
  PHASE_CHANGED:         'phase:changed',
  KNOCKOUT_BRACKET:      'knockout:bracket',
} as const

export interface ServerToClientEvents {
  [EVENTS.MATCH_STATE]:           (state: MatchState) => void
  [EVENTS.MATCH_EVENT]:           (event: MatchEvent) => void
  [EVENTS.MATCH_STARTED]:         (data: { matchId: string; tournamentId: string }) => void
  [EVENTS.MATCH_ENDED]:           (data: { matchId: string; winnerId: string }) => void
  [EVENTS.MATCH_RESET]:           (data: { matchId: string }) => void
  [EVENTS.BOARD_UPDATED]:         (data: { board: number; matchId: string; state: MatchState }) => void
  [EVENTS.DART_IN_PROGRESS]:      (data: DartInProgressData) => void
  [EVENTS.JUDGE_CLAIMS_UPDATED]:  (claims: Record<string, string>) => void
  [EVENTS.LEAGUE_STANDINGS]:      (standings: LeagueStanding[]) => void
  [EVENTS.LEAGUE_ROUND_COMPLETE]: (data: { roundNumber: number; standings: LeagueStanding[] }) => void
  [EVENTS.PHASE_CHANGED]:         (data: { phase: 'knockout'; knockoutRounds: BracketRound[] }) => void
  [EVENTS.KNOCKOUT_BRACKET]:      (rounds: BracketRound[]) => void
}

export interface ClientToServerEvents {
  [EVENTS.SUBSCRIBE_TOURNAMENT]: (tournamentId: string) => void
  [EVENTS.SUBSCRIBE_MATCH]:      (matchId: string) => void
  [EVENTS.SUBSCRIBE_BOARD]:      (board: number) => void
  [EVENTS.SUBSCRIBE_JUDGES]:     () => void
  [EVENTS.DART_THROWN]:          (data: { matchId: string; notation: string }) => void
  [EVENTS.JUDGE_CLAIM_MATCH]:    (data: { matchId: string; judgeId: string }) => void
  [EVENTS.JUDGE_RELEASE_MATCH]:  (data: { matchId: string }) => void
}
