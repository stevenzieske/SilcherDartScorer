import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { socket } from '../../socket/socket.client'
import { usePlayers } from '../../hooks/usePlayers'
import { EVENTS, buildCheckoutDisplay } from '@dart/shared'
import type { Match, MatchState, DartInProgressData, TurnData } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'

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
    const { players, getName } = usePlayers()
    const alreadyCompleteOnLoad = useRef(false)
    // Prevents a slow HTTP response from overwriting a fresher state already delivered via socket
    const socketStateReceived = useRef(false)

    useEffect(() => {
        if (matchState?.status === 'match_complete' && id && !alreadyCompleteOnLoad.current) {
            const t = setTimeout(() => navigate(`/spectator/tournaments/${id}`), 3000)
            return () => clearTimeout(t)
        }
    }, [matchState?.status, id])

    useEffect(() => {
        http.get<Match>(`/matches/${matchId}`).then(r => setMatch(r.data))
    }, [matchId])

    useEffect(() => {
        socketStateReceived.current = false
        if (!socket.connected) socket.connect()

        http.get<MatchState>(`/matches/${matchId}/state`)
            .then(r => {
                if (socketStateReceived.current) return
                if (r.data.status === 'match_complete') alreadyCompleteOnLoad.current = true
                setMatchState(r.data)
            })
            .catch(() => {})

        socket.emit(EVENTS.SUBSCRIBE_MATCH, matchId!)
        if (id) socket.emit(EVENTS.SUBSCRIBE_TOURNAMENT, id)

        const handleMatchState = (state: MatchState) => {
            socketStateReceived.current = true
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
            <div className="h-[100dvh] bg-gray-950 text-white flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        )
    }

    const leg = matchState?.currentLeg
    const currentPlayerIndex = leg?.currentPlayerIndex ?? 0
    const turns = leg?.turns ?? []
    const previousLegs = matchState?.previousLegs ?? []

    const getDisplayScore = (i: number): number | string => {
        if (i === currentPlayerIndex && inProgress) return inProgress.runningRemaining
        return leg?.remaining[i] ?? '—'
    }

    const turnStartRemaining = inProgress?.remainingBefore ?? (leg?.remaining[currentPlayerIndex] ?? 0)
    const thrownNotations = inProgress?.dartsThrown.map(d => d.notation) ?? []
    const currentRemaining = inProgress?.runningRemaining ?? (leg?.remaining[currentPlayerIndex] ?? 0)
    const checkoutDisplay = buildCheckoutDisplay(turnStartRemaining, thrownNotations, currentRemaining)

    return (
        <div className="h-[100dvh] overflow-hidden bg-gray-950 text-white flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 pb-4 shrink-0"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="mb-4">
                    <BackButton label="Tournament" />
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
                                <p key={score} className={`text-5xl font-bold tabular-nums animate-pop ${isBust ? 'text-red-400' : ''}`}>
                                    {score}
                                </p>
                                <div className="flex justify-center gap-3 mt-1.5">
                                    <p className="text-xs text-gray-500">{matchState?.legsWon[i] ?? 0}/{matchState?.rules.legsToWin ?? match?.ruleLegsToWin ?? '?'} legs</p>
                                    <p className="text-xs text-gray-500">{dartCount(playerId, turns)} darts</p>
                                    <p className="text-xs text-gray-500">avg {calcAverage(playerId, turns)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {leg && (
                    <p className="text-center text-xs text-gray-500 mt-3">
                        {matchState?.status === 'match_complete'
                            ? `Leg ${leg.legNumber}`
                            : `Leg ${leg.legNumber} · ${getName(match.players[currentPlayerIndex])}'s turn`}
                    </p>
                )}
            </div>

            {/* Checkout hint */}
            <div className={`px-4 py-2 border-b border-gray-800 flex items-center justify-center gap-2 min-h-[36px] shrink-0 ${
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

            {/* Current 3 darts — only shown for live matches */}
            {matchState?.status !== 'match_complete' && (
                <div className="flex justify-center gap-3 px-4 py-3 bg-gray-950 border-b border-gray-800 shrink-0">
                    {[0, 1, 2].map(i => {
                        const dart = inProgress?.dartsThrown[i]
                        return (
                            <div key={i} className={`flex-1 max-w-[80px] h-14 rounded-xl flex items-center justify-center text-sm font-bold border ${
                                dart ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-600'
                            }`}>
                                {dart?.notation ?? '—'}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Turn history */}
            <div className="flex-1 overflow-y-auto"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {matchState?.winnerId && (
                    <div className="py-5 text-center border-b border-gray-800 animate-slide-up">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Winner</p>
                        <p className="text-2xl font-bold">{getName(matchState.winnerId)}</p>
                        {matchState.status === 'match_complete' && (
                            <p className="text-xs text-gray-600 mt-2">Returning to overview…</p>
                        )}
                    </div>
                )}

                {turns.length === 0 && previousLegs.length === 0 && !matchState?.winnerId && (
                    <div className="flex items-center justify-center py-10">
                        <p className="text-gray-700 text-sm">No throws yet</p>
                    </div>
                )}

                {/* All legs newest-first: current leg, then previous legs in reverse */}
                {[leg, ...[...previousLegs].reverse()].map((legData, legIdx) => {
                    if (!legData || legData.turns.length === 0) return null
                    const isCurrentLeg = legIdx === 0
                    return (
                        <div key={legData.legNumber}>
                            <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/60">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Leg {legData.legNumber}
                                </span>
                                {isCurrentLeg && matchState?.status !== 'match_complete' && (
                                    <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                                        Live
                                    </span>
                                )}
                            </div>
                            {[...legData.turns].reverse().map((turn, i) => {
                                const playerColor = players.find(p => p._id === turn.playerId)?.avatarColor ?? '#6b7280'
                                return (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-900 ${
                                        turn.isCheckout ? 'bg-green-950/20' : turn.isBust ? 'bg-red-950/20' : ''
                                    }`}>
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: playerColor }} />
                                        <span className="text-sm font-medium text-gray-300 w-16 truncate shrink-0">{getName(turn.playerId)}</span>
                                        <div className="flex gap-1 flex-1 flex-wrap">
                                            {turn.darts.map((d, j) => (
                                                <span key={j} className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${
                                                    d.notation === 'MISS' ? 'bg-gray-800 text-gray-600' : 'bg-gray-800 text-gray-300'
                                                }`}>{d.notation}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {turn.isBust ? (
                                                <span className="text-xs text-red-400 font-semibold">Bust</span>
                                            ) : turn.isCheckout ? (
                                                <span className="text-xs text-green-400 font-semibold">CO</span>
                                            ) : (
                                                <span className="text-sm font-bold tabular-nums text-white">{turn.turnScore}</span>
                                            )}
                                            <span className="text-xs text-gray-600 tabular-nums w-7 text-right">
                                                {!turn.isBust && turn.remainingAfter > 0 ? turn.remainingAfter : ''}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
