import { MatchState } from './types/match-engine.types'
import { MatchEvent } from './types/match.types'
import { Player } from './types/player.types'
import { BracketRound } from './types/tournament.types'

export const EVENTS = {
  // Client → Server
  SUBSCRIBE_TOURNAMENT: 'subscribe:tournament',
  SUBSCRIBE_MATCH:      'subscribe:match',
  SUBSCRIBE_BOARD:      'subscribe:board',

  // Server → Client
  MATCH_STATE:        'match:state',
  MATCH_EVENT:        'match:event',
  MATCH_STARTED:      'match:started',
  MATCH_ENDED:        'match:ended',
  TOURNAMENT_BRACKET: 'tournament:bracket',
  BOARD_UPDATED:      'board:updated',
} as const

export interface ServerToClientEvents {
  [EVENTS.MATCH_STATE]:        (state: MatchState) => void
  [EVENTS.MATCH_EVENT]:        (event: MatchEvent) => void
  [EVENTS.MATCH_STARTED]:      (data: { matchId: string; board: number; players: Player[] }) => void
  [EVENTS.MATCH_ENDED]:        (data: { matchId: string; winnerId: string }) => void
  [EVENTS.TOURNAMENT_BRACKET]: (rounds: BracketRound[]) => void
  [EVENTS.BOARD_UPDATED]:      (data: { board: number; matchId: string; state: MatchState }) => void
}

export interface ClientToServerEvents {
  [EVENTS.SUBSCRIBE_TOURNAMENT]: (tournamentId: string) => void
  [EVENTS.SUBSCRIBE_MATCH]:      (matchId: string) => void
  [EVENTS.SUBSCRIBE_BOARD]:      (board: number) => void
}
