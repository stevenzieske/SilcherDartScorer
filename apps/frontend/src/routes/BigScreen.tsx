import { useEffect, useState } from 'react'
import { QRCode } from 'react-qr-code'
import http from '../api/client'
import { socket } from '../socket/socket.client'
import { useTournamentStore } from '../stores/tournament.store'
import { usePlayers } from '../hooks/usePlayers'
import type { Match, MatchState, Tournament, DartInProgressData } from '@dart/shared'
import { EVENTS, MatchStatus, TournamentStatus, buildCheckoutDisplay } from '@dart/shared'

export default function BigScreen() {
    const { activeTournament, setActiveTournament, updateStandings } = useTournamentStore()
    const { getName } = usePlayers()
    const [liveMatches, setLiveMatches] = useState<Match[]>([])
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
    const [matchStates, setMatchStates] = useState<Record<string, MatchState>>({})
    const [inProgressByMatch, setInProgressByMatch] = useState<Record<string, DartInProgressData>>({})
    const [networkUrl, setNetworkUrl] = useState(window.location.origin)

    useEffect(() => {
        http.get<{ ip: string | null }>('/network-ip').then(r => {
            if (r.data.ip) {
                const port = window.location.port || '5173'
                setNetworkUrl(`http://${r.data.ip}:${port}`)
            }
        }).catch(() => {})
    }, [])

    useEffect(() => {
        http.get<Tournament[]>('/tournaments').then(r => {
            const active = r.data.find(t => t.status === TournamentStatus.Active)
            if (active) setActiveTournament(active)
        })
        Promise.all([
            http.get<Match[]>('/matches?status=active'),
            http.get<Match[]>('/matches?status=pending'),
        ]).then(([activeRes, pendingRes]) => {
            setLiveMatches(activeRes.data)
            setUpcomingMatches(pendingRes.data)
            // Fetch initial state for each active match
            activeRes.data.forEach(m => {
                http.get<MatchState>(`/matches/${m._id}/state`)
                    .then(r => setMatchStates(prev => ({ ...prev, [m._id]: r.data })))
                    .catch(() => {})
            })
        })
    }, [])

    useEffect(() => {
        if (!socket.connected) socket.connect()
        socket.on(EVENTS.LEAGUE_STANDINGS, updateStandings)

        const handleMatchState = (state: MatchState) => {
            if (state.status === 'active') {
                setUpcomingMatches(prev => prev.filter(m => m._id !== state.matchId))
                setLiveMatches(prev => {
                    if (prev.find(m => m._id === state.matchId)) return prev
                    return [...prev, { _id: state.matchId, players: state.players, status: MatchStatus.Active } as Match]
                })
                // Fetch state for newly active match if not yet known
                setMatchStates(prev => {
                    if (prev[state.matchId]) return { ...prev, [state.matchId]: state }
                    return { ...prev, [state.matchId]: state }
                })
            }
            if (state.status === 'match_complete') {
                setLiveMatches(prev => prev.filter(m => m._id !== state.matchId))
            }
            setMatchStates(prev => ({ ...prev, [state.matchId]: state }))
            // Clear in-progress for this match when turn completes
            setInProgressByMatch(prev => {
                const next = { ...prev }
                delete next[state.matchId]
                return next
            })
        }
        socket.on(EVENTS.MATCH_STATE, handleMatchState)

        const handleInProgress = (data: DartInProgressData) => {
            setInProgressByMatch(prev => ({ ...prev, [data.matchId]: data }))
        }
        socket.on(EVENTS.DART_IN_PROGRESS, handleInProgress)

        return () => {
            socket.off(EVENTS.LEAGUE_STANDINGS, updateStandings)
            socket.off(EVENTS.MATCH_STATE, handleMatchState)
            socket.off(EVENTS.DART_IN_PROGRESS, handleInProgress)
        }
    }, [])

    useEffect(() => {
        if (activeTournament) socket.emit(EVENTS.SUBSCRIBE_TOURNAMENT, activeTournament._id)
    }, [activeTournament?._id])

    useEffect(() => {
        liveMatches.forEach(m => socket.emit(EVENTS.SUBSCRIBE_MATCH, m._id))
    }, [liveMatches])

    const standings = activeTournament?.standings ?? []

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 bg-gray-900 border-b border-gray-800">
                <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">Silcher Dart Scorer</h1>
                    {activeTournament && (
                        <p className="text-gray-400 text-xs md:text-sm mt-0.5 truncate">{activeTournament.name}</p>
                    )}
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 mb-0.5">Scan to join</p>
                        <p className="text-xs font-mono text-gray-500 max-w-[180px] truncate">{networkUrl}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg">
                        <QRCode value={networkUrl} size={52} className="md:hidden" />
                        <QRCode value={networkUrl} size={72} className="hidden md:block" />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row flex-1">

                {/* Live + Upcoming */}
                <div className="flex-1 p-4 md:p-6 order-1 lg:order-2">
                    {liveMatches.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                Live
                                <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full" />
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {liveMatches.map(m => {
                                    const state = matchStates[m._id]
                                    const inProg = inProgressByMatch[m._id]
                                    const currentIdx = state?.currentLeg.currentPlayerIndex ?? 0
                                    const legsWon = state?.legsWon ?? m.legsWon ?? [0, 0]

                                    const getScore = (i: number) => {
                                        if (i === currentIdx && inProg) return inProg.runningRemaining
                                        return state?.currentLeg.remaining[i] ?? '—'
                                    }

                                    const turnStartRem = inProg?.remainingBefore ?? (state?.currentLeg.remaining[currentIdx] ?? 0)
                                    const thrown = inProg?.dartsThrown.map(d => d.notation) ?? []
                                    const currentRem = inProg?.runningRemaining ?? (state?.currentLeg.remaining[currentIdx] ?? 0)
                                    const checkout = buildCheckoutDisplay(turnStartRem, thrown, currentRem)

                                    return (
                                        <div key={m._id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                                            <div className="p-4 md:p-5">
                                                {m.board && (
                                                    <p className="text-xs text-gray-500 mb-2">Board {m.board}</p>
                                                )}
                                                <div className="flex items-center justify-between gap-2">
                                                    {m.players.map((playerId, i) => {
                                                        const score = getScore(i)
                                                        const isBust = i === currentIdx && typeof score === 'number' && score < 0
                                                        return (
                                                            <div key={playerId}
                                                                className={`flex-1 text-center ${i === currentIdx ? 'opacity-100' : 'opacity-40'}`}>
                                                                <p className="text-xs md:text-sm text-gray-300 truncate mb-1">{getName(playerId)}</p>
                                                                <p className={`text-4xl md:text-5xl font-bold tabular-nums ${isBust ? 'text-red-400' : ''}`}>
                                                                    {score}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {legsWon[i]} leg{legsWon[i] !== 1 ? 's' : ''}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            {/* Checkout strip */}
                                            {checkout && (
                                                <div className="px-4 py-2 bg-green-950 border-t border-green-900 flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">Checkout</span>
                                                    <div className="flex gap-1.5">
                                                        {checkout.map((d, i) => (
                                                            <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                                d.done
                                                                    ? 'text-green-700 bg-green-950 line-through'
                                                                    : 'text-green-300 bg-green-900'
                                                            }`}>{d.notation}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {upcomingMatches.length > 0 && (
                        <div>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming</h2>
                            <div className="flex flex-col gap-2">
                                {upcomingMatches.map(m => (
                                    <div key={m._id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                                        <p className="font-medium text-sm">
                                            {m.players.map((id, i) => (
                                                <span key={id}>
                                                    {getName(id)}
                                                    {i === 0 && <span className="text-gray-600 mx-2">vs</span>}
                                                </span>
                                            ))}
                                        </p>
                                        {m.board && <span className="text-xs text-gray-500 shrink-0 ml-3">Board {m.board}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {liveMatches.length === 0 && upcomingMatches.length === 0 && (
                        <p className="text-gray-600 text-sm">No matches yet</p>
                    )}
                </div>

                {/* Standings */}
                <div className="lg:w-72 xl:w-80 border-t border-gray-800 lg:border-t-0 lg:border-r p-4 md:p-6 order-2 lg:order-1">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Standings</h2>
                    {standings.length === 0 ? (
                        <p className="text-gray-600 text-sm">No standings yet</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left pb-2">#</th>
                                    <th className="text-left pb-2">Player</th>
                                    <th className="text-center pb-2">P</th>
                                    <th className="text-center pb-2">W</th>
                                    <th className="text-center pb-2">L</th>
                                    <th className="text-center pb-2">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((s, i) => (
                                    <tr key={s.playerId} className="border-t border-gray-800">
                                        <td className="py-2 text-gray-500">{i + 1}</td>
                                        <td className="py-2 font-medium">{getName(s.playerId)}</td>
                                        <td className="py-2 text-center text-gray-400">{s.played}</td>
                                        <td className="py-2 text-center text-green-400">{s.won}</td>
                                        <td className="py-2 text-center text-red-400">{s.lost}</td>
                                        <td className="py-2 text-center font-bold">{s.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
