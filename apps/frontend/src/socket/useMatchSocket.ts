import { useEffect } from 'react'
import { socket } from './socket.client'
import { EVENTS } from '@dart/shared'
import type { MatchState } from '@dart/shared'
import { useMatchStore } from '../stores/match.store'
import { useTournamentStore } from '../stores/tournament.store'
import http from '../api/client'

export function useMatchSocket(matchId: string, tournamentId?: string) {
    const { setMatchState, setInProgress } = useMatchStore()
    const { updateStandings } = useTournamentStore()

    useEffect(() => {
        if (!socket.connected) socket.connect()

        // Seed initial state via HTTP — socket only pushes updates after each throw
        http.get<MatchState>(`/matches/${matchId}/state`).then(r => setMatchState(r.data)).catch(() => {})

        socket.emit(EVENTS.SUBSCRIBE_MATCH, matchId)
        if (tournamentId) socket.emit(EVENTS.SUBSCRIBE_TOURNAMENT, tournamentId)

        socket.on(EVENTS.MATCH_STATE, setMatchState)
        socket.on(EVENTS.DART_IN_PROGRESS, setInProgress)
        socket.on(EVENTS.LEAGUE_STANDINGS, updateStandings)

        return () => {
            socket.off(EVENTS.MATCH_STATE, setMatchState)
            socket.off(EVENTS.DART_IN_PROGRESS, setInProgress)
            socket.off(EVENTS.LEAGUE_STANDINGS, updateStandings)
        }
    }, [matchId])
}
