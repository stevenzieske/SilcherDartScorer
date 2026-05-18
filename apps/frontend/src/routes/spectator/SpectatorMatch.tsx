import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { socket } from '../../socket/socket.client'
import { usePlayers } from '../../hooks/usePlayers'
import { EVENTS, buildCheckoutDisplay } from '@dart/shared'
import type { Match, MatchState, DartInProgressData, TurnData } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

function calcAverage(playerId: string, turns: TurnData[]): string {
    const mine = turns.filter(t => t.playerId === playerId)
    const totalDarts = mine.reduce((s, t) => s + t.darts.length, 0)
    const totalScore = mine.reduce((s, t) => s + t.turnScore, 0)
    if (totalDarts === 0) return '—'
    return ((totalScore / totalDarts) * 3).toFixed(1)
}

function dartCount(playerId: string, turns: TurnData[]): number {
    return turns.filter(t => t.playerId === playerId).reduce((s, t) => s + t.darts.length, 0)
}

export default function SpectatorMatch() {
    const { id, matchId } = useParams<{ id: string; matchId: string }>()
    const navigate = useNavigate()
    const [match, setMatch] = useState<Match | null>(null)
    const [matchState, setMatchState] = useState<MatchState | null>(null)
    const [inProgress, setInProgress] = useState<DartInProgressData | null>(null)
    const { getName } = usePlayers()

    // Fetch match document
    useEffect(() => {
        http.get<Match>(`/matches/${matchId}`).then(r => setMatch(r.data))
    }, [matchId])

    // Socket + initial state — fully local, no global store
    useEffect(() => {
        if (!socket.connected) socket.connect()

        http.get<MatchState>(`/matches/${matchId}/state`)
            .then(r => setMatchState(r.data))
            .catch(() => {})

        socket.emit(EVENTS.SUBSCRIBE_MATCH, matchId!)
        if (id) socket.emit(EVENTS.SUBSCRIBE_TOURNAMENT, id)

        const handleMatchState = (state: MatchState) => {
            setMatchState(state)
            setInProgress(null)
        }
        const handleInProgress = (data: DartInProgressData) => setInProgress(data)

        socket.on(EVENTS.MATCH_STATE, handleMatchState)
        socket.on(EVENTS.DART_IN_PROGRESS, handleInProgress)

        return () => {
            socket.off(EVENTS.MATCH_STATE, handleMatchState)
            socket.off(EVENTS.DART_IN_PROGRESS, handleInProgress)
        }
    }, [matchId])

    if (!match) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        )
    }

    const leg = matchState?.currentLeg
    const currentPlayerIndex = leg?.currentPlayerIndex ?? 0
    const turns = leg?.turns ?? []

    const getDisplayScore = (i: number): number | string => {
        if (i === currentPlayerIndex && inProgress) return inProgress.runningRemaining
        return leg?.remaining[i] ?? '—'
    }

    const turnStartRemaining = inProgress?.remainingBefore ?? (leg?.remaining[currentPlayerIndex] ?? 0)
    const thrownNotations = inProgress?.dartsThrown.map(d => d.notation) ?? []
    const currentRemaining = inProgress?.runningRemaining ?? (leg?.remaining[currentPlayerIndex] ?? 0)
    const checkoutDisplay = buildCheckoutDisplay(turnStartRemaining, thrownNotations, currentRemaining)

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-5">
                <div className="flex items-center gap-4 mb-5">
                    <HomeButton />
                    <button onClick={() => navigate(`/spectator/tournaments/${id}`)}
                        className="text-gray-500 hover:text-white text-sm transition-colors">
                        ← Tournament
                    </button>
                </div>
                <div className="flex justify-around items-center gap-2">
                    {match.players.map((playerId, i) => {
                        const active = i === currentPlayerIndex
                        const score = getDisplayScore(i)
                        const isBust = active && typeof score === 'number' && score < 0
                        return (
                            <div key={playerId} className={`flex-1 rounded-2xl p-3 text-center transition-all ${
                                active ? 'bg-gray-800 ring-1 ring-gray-600' : 'opacity-30'
                            }`}>
                                <p className="text-sm text-gray-400 mb-1 truncate">{getName(playerId)}</p>
                                <p className={`text-6xl font-bold tabular-nums ${isBust ? 'text-red-400' : ''}`}>
                                    {score}
                                </p>
                                <div className="flex justify-center gap-3 mt-2">
                                    <p className="text-xs text-gray-500">{matchState?.legsWon[i] ?? 0} legs</p>
                                    <p className="text-xs text-gray-500">{dartCount(playerId, turns)} darts</p>
                                    <p className="text-xs text-gray-500">avg {calcAverage(playerId, turns)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {leg && (
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Leg {leg.legNumber} · {getName(match.players[currentPlayerIndex])}'s turn
                    </p>
                )}
            </div>

            {/* Checkout hint */}
            <div className={`px-4 py-2 border-b border-gray-800 flex items-center justify-center gap-2 min-h-[36px] ${
                checkoutDisplay ? 'bg-green-950' : 'bg-gray-950'
            }`}>
                {checkoutDisplay ? (
                    <>
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-500">Checkout</span>
                        <div className="flex gap-1.5">
                            {checkoutDisplay.map((d, i) => (
                                <span key={i} className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                                    d.done
                                        ? 'text-green-700 bg-green-950 line-through'
                                        : 'text-green-300 bg-green-900'
                                }`}>{d.notation}</span>
                            ))}
                        </div>
                    </>
                ) : (
                    <span className="text-xs text-gray-700">—</span>
                )}
            </div>

            {/* Live darts in progress */}
            {inProgress && (
                <div className="px-4 py-4 border-b border-gray-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">In progress</p>
                    <div className="flex gap-3">
                        {inProgress.dartsThrown.map((d, i) => (
                            <div key={i} className="flex-1 bg-gray-900 border border-gray-800 rounded-xl py-3 flex flex-col items-center">
                                <p className="text-xs text-gray-500">{d.notation}</p>
                                <p className="text-2xl font-bold">{d.score}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-sm text-gray-400 mt-3">
                        {inProgress.runningScore} scored · {Math.max(0, inProgress.runningRemaining)} remaining
                    </p>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center p-8">
                {match.winnerId ? (
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Winner</p>
                        <p className="text-3xl font-bold">{getName(match.winnerId)}</p>
                    </div>
                ) : (
                    <p className="text-gray-700 text-sm">Watching live</p>
                )}
            </div>
        </div>
    )
}
