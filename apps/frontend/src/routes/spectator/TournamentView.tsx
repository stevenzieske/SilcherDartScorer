import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCode } from 'react-qr-code'
import http from '../../api/client'
import { socket } from '../../socket/socket.client'
import { usePlayers } from '../../hooks/usePlayers'
import type { Tournament, Match, MatchState, DartInProgressData, LeagueStanding } from '@dart/shared'
import { EVENTS, MatchStatus, TournamentStatus, buildCheckoutDisplay } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'

export default function TournamentView() {
    const { id } = useParams<{ id?: string }>()
    const navigate = useNavigate()
    const { getName } = usePlayers()

    const [tournamentId, setTournamentId] = useState<string | undefined>(id)
    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [allMatches, setAllMatches] = useState<Match[]>([])
    const [matchStates, setMatchStates] = useState<Record<string, MatchState>>({})
    const [inProgressByMatch, setInProgressByMatch] = useState<Record<string, DartInProgressData>>({})
    const [networkUrl, setNetworkUrl] = useState(window.location.origin)
    const [celebratingMatches, setCelebratingMatches] = useState<Record<string, { winnerId: string; exiting: boolean }>>({})

    // Resolve tournament ID — from URL or find active
    useEffect(() => {
        if (id) { setTournamentId(id); return }
        http.get<Tournament[]>('/tournaments').then(r => {
            const active = r.data.find(t => t.status === TournamentStatus.Active)
            if (active) setTournamentId(active._id)
        })
    }, [id])

    // QR code network URL
    useEffect(() => {
        http.get<{ ip: string | null }>('/network-ip').then(r => {
            if (r.data.ip) setNetworkUrl(`http://${r.data.ip}:${window.location.port || '5173'}`)
        }).catch(() => {})
    }, [])

    // Load tournament + all matches
    useEffect(() => {
        if (!tournamentId) return
        http.get<Tournament>(`/tournaments/${tournamentId}`).then(r => setTournament(r.data))
        http.get<Match[]>(`/matches?tournamentId=${tournamentId}`).then(r => {
            setAllMatches(r.data)
            r.data.filter(m => m.status === MatchStatus.Active).forEach(m => {
                http.get<MatchState>(`/matches/${m._id}/state`)
                    .then(s => setMatchStates(prev => ({ ...prev, [m._id]: s.data })))
                    .catch(() => {})
            })
        })
    }, [tournamentId])

    // Socket subscriptions
    useEffect(() => {
        if (!tournamentId) return
        if (!socket.connected) socket.connect()
        socket.emit(EVENTS.SUBSCRIBE_TOURNAMENT, tournamentId)

        const handleStandings = (standings: LeagueStanding[]) =>
            setTournament(prev => prev ? { ...prev, standings } : prev)

        const handleMatchState = (state: MatchState) => {
            setMatchStates(prev => ({ ...prev, [state.matchId]: state }))
            setInProgressByMatch(prev => { const n = { ...prev }; delete n[state.matchId]; return n })
            if (state.status === 'match_complete') {
                setCelebratingMatches(prev => ({ ...prev, [state.matchId]: { winnerId: state.winnerId ?? '', exiting: false } }))
                setTimeout(() => {
                    setCelebratingMatches(prev => {
                        if (!prev[state.matchId]) return prev
                        return { ...prev, [state.matchId]: { ...prev[state.matchId], exiting: true } }
                    })
                }, 2800)
                setTimeout(() => {
                    setCelebratingMatches(prev => { const n = { ...prev }; delete n[state.matchId]; return n })
                    setAllMatches(prev => prev.map(m =>
                        m._id === state.matchId
                            ? { ...m, status: MatchStatus.Completed, winnerId: state.winnerId ?? m.winnerId ?? null }
                            : m
                    ))
                }, 3300)
            } else {
                setAllMatches(prev => prev.map(m =>
                    m._id === state.matchId
                        ? { ...m, status: MatchStatus.Active, winnerId: state.winnerId ?? m.winnerId ?? null }
                        : m
                ))
            }
        }

        const handleInProgress = (data: DartInProgressData) =>
            setInProgressByMatch(prev => ({ ...prev, [data.matchId]: data }))

        const handleMatchStarted = ({ matchId }: { matchId: string; tournamentId: string }) => {
            setAllMatches(prev => prev.map(m =>
                m._id === matchId ? { ...m, status: MatchStatus.Active } : m
            ))
            socket.emit(EVENTS.SUBSCRIBE_MATCH, matchId)
            http.get<MatchState>(`/matches/${matchId}/state`)
                .then(s => setMatchStates(prev => ({ ...prev, [matchId]: s.data })))
                .catch(() => {})
        }

        const handleReset = ({ matchId }: { matchId: string }) => {
            setCelebratingMatches(prev => { const n = { ...prev }; delete n[matchId]; return n })
            setAllMatches(prev => prev.map(m =>
                m._id === matchId ? { ...m, status: MatchStatus.Pending, winnerId: null } : m
            ))
            setMatchStates(prev => { const n = { ...prev }; delete n[matchId]; return n })
            setInProgressByMatch(prev => { const n = { ...prev }; delete n[matchId]; return n })
        }

        const handleKnockoutBracket = () => {
            http.get<Match[]>(`/matches?tournamentId=${tournamentId}`).then(r => {
                setAllMatches(prev => {
                    const prevById = new Map(prev.map(m => [m._id, m]))
                    return r.data.map(m => {
                        const existing = prevById.get(m._id)
                        // Keep Active status if the match is currently in celebration (timer will complete it)
                        if (existing?.status === MatchStatus.Active && m.status === MatchStatus.Completed) {
                            return existing
                        }
                        return m
                    })
                })
            })
            http.get<Tournament>(`/tournaments/${tournamentId}`).then(r => setTournament(r.data))
        }

        const handleTournamentUpdated = ({ status }: { tournamentId: string; status: string }) => {
            setTournament(prev => prev ? { ...prev, status: status as Tournament['status'] } : prev)
        }

        socket.on(EVENTS.LEAGUE_STANDINGS, handleStandings)
        socket.on(EVENTS.MATCH_STATE, handleMatchState)
        socket.on(EVENTS.DART_IN_PROGRESS, handleInProgress)
        socket.on(EVENTS.MATCH_STARTED, handleMatchStarted)
        socket.on(EVENTS.MATCH_RESET, handleReset)
        socket.on(EVENTS.KNOCKOUT_BRACKET, handleKnockoutBracket)
        socket.on(EVENTS.TOURNAMENT_UPDATED, handleTournamentUpdated)

        return () => {
            socket.off(EVENTS.LEAGUE_STANDINGS, handleStandings)
            socket.off(EVENTS.MATCH_STATE, handleMatchState)
            socket.off(EVENTS.DART_IN_PROGRESS, handleInProgress)
            socket.off(EVENTS.MATCH_STARTED, handleMatchStarted)
            socket.off(EVENTS.MATCH_RESET, handleReset)
            socket.off(EVENTS.KNOCKOUT_BRACKET, handleKnockoutBracket)
            socket.off(EVENTS.TOURNAMENT_UPDATED, handleTournamentUpdated)
        }
    }, [tournamentId])

    // Subscribe to each active match room
    useEffect(() => {
        allMatches.filter(m => m.status === MatchStatus.Active)
            .forEach(m => socket.emit(EVENTS.SUBSCRIBE_MATCH, m._id))
    }, [allMatches])

    const standings: LeagueStanding[] = tournament?.standings ?? []
    const liveMatches = allMatches.filter(m => m.status === MatchStatus.Active)
    const upcomingMatches = allMatches.filter(m => m.status === MatchStatus.Pending)
    const completedMatches = allMatches.filter(m => m.status === MatchStatus.Completed)

    const isKnockout = (m: Match) => m.leagueRound === null

    // Build matchId → roundName from the bracket for matches that predate the roundName field
    const bracketRoundNameById = useMemo(() => {
        const map: Record<string, string> = {}
        for (const round of tournament?.knockoutRounds ?? []) {
            for (const slot of round.slots) {
                if (slot.matchId) map[slot.matchId] = round.roundName
            }
        }
        return map
    }, [tournament?.knockoutRounds])

    const matchRoundLabel = (m: Match) =>
        m.roundName ?? bracketRoundNameById[m._id] ?? ''

    const placementOrder = (label: string) => {
        if (label === 'Final') return 1
        const n = label.match(/^(\d+)/)
        return n ? parseInt(n[1]) : 99
    }

    const liveKo = liveMatches.filter(isKnockout)
    const liveLg = liveMatches.filter(m => !isKnockout(m))
    const upcomingKo = upcomingMatches.filter(isKnockout)
    const upcomingLg = upcomingMatches.filter(m => !isKnockout(m))
    const completedKo = [...completedMatches.filter(isKnockout)].sort((a, b) => {
        const rnDiff = (b.roundNumber ?? 0) - (a.roundNumber ?? 0)
        if (rnDiff !== 0) return rnDiff
        return placementOrder(matchRoundLabel(a)) - placementOrder(matchRoundLabel(b))
    })
    const completedLg = completedMatches.filter(m => !isKnockout(m))

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 pb-3 md:pb-4 bg-gray-900 border-b border-gray-800"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-3 min-w-0">
                    <BackButton to="/" label="Home" />
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-2xl font-bold tracking-tight truncate">
                            {tournament?.name ?? 'Tournament'}
                        </h1>
                        {tournament && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                tournament.status === TournamentStatus.Active
                                    ? 'bg-green-900 text-green-400'
                                    : 'bg-gray-800 text-gray-400'
                            }`}>{tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}</span>
                        )}
                    </div>
                </div>
                {/* QR code — only on large screens */}
                <div className="hidden lg:flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-400 mb-0.5">Scan to join</p>
                        <p className="text-xs font-mono text-gray-500 max-w-[200px] truncate">{networkUrl}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg">
                        <QRCode value={networkUrl} size={72} />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row flex-1">

                {/* Live + Upcoming + Completed */}
                <div className="flex-1 p-4 md:p-6 order-1 lg:order-2">

                    {/* Live matches */}
                    {liveMatches.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                                Live <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full" />
                            </p>

                            {liveKo.length > 0 && (
                                <div className={liveLg.length > 0 ? 'mb-4' : ''}>
                                    {liveLg.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">Knockout</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {liveKo.map(m => {
                                            const celebrating = celebratingMatches[m._id]
                                            if (celebrating) {
                                                return (
                                                    <div key={m._id}
                                                        className={`bg-gray-900 rounded-2xl border border-yellow-600 overflow-hidden transition-all duration-500 ${
                                                            celebrating.exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                                        }`}>
                                                        <div className="p-6 md:p-8 flex flex-col items-center justify-center gap-2 text-center min-h-[160px]">
                                                            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">Match Complete</p>
                                                            <p className="text-3xl md:text-4xl font-bold text-yellow-400 mt-1">{getName(celebrating.winnerId)}</p>
                                                            <p className="text-sm text-yellow-600 font-semibold">Winner!</p>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            const state = matchStates[m._id]
                                            const inProg = inProgressByMatch[m._id]
                                            const currentIdx = state?.currentLeg.currentPlayerIndex ?? 0
                                            const legsWon = state?.legsWon ?? m.legsWon ?? [0, 0]
                                            const getScore = (i: number) => i === currentIdx && inProg ? inProg.runningRemaining : (state?.currentLeg.remaining[i] ?? '—')
                                            const turnStartRem = inProg?.remainingBefore ?? (state?.currentLeg.remaining[currentIdx] ?? 0)
                                            const thrown = inProg?.dartsThrown.map(d => d.notation) ?? []
                                            const checkout = buildCheckoutDisplay(turnStartRem, thrown, inProg?.runningRemaining ?? (state?.currentLeg.remaining[currentIdx] ?? 0))
                                            return (
                                                <div key={m._id}
                                                    onClick={() => tournamentId && navigate(`/spectator/tournaments/${tournamentId}/matches/${m._id}`)}
                                                    className="bg-gray-900 rounded-2xl border border-amber-800 hover:border-amber-700 cursor-pointer overflow-hidden transition-colors">
                                                    <div className="p-4 md:p-5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                                                {matchRoundLabel(m)}
                                                            </span>
                                                            {m.board && <span className="text-xs text-gray-500">Board {m.board}</span>}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            {m.players.map((playerId, i) => {
                                                                const score = getScore(i)
                                                                const isBust = i === currentIdx && typeof score === 'number' && score < 0
                                                                return (
                                                                    <div key={playerId} className={`flex-1 text-center ${i === currentIdx ? 'opacity-100' : 'opacity-40'}`}>
                                                                        <p className="text-xs md:text-sm text-gray-300 truncate mb-1">{getName(playerId)}</p>
                                                                        <p className={`text-4xl md:text-5xl font-bold tabular-nums ${isBust ? 'text-red-400' : ''}`}>{score}</p>
                                                                        <p className="text-xs text-gray-500 mt-1">{legsWon[i]}/{state?.rules.legsToWin ?? m.ruleLegsToWin ?? '?'} legs</p>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    {checkout && (
                                                        <div className="px-4 py-2 bg-green-950 border-t border-green-900 flex items-center justify-center gap-2">
                                                            <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">Checkout</span>
                                                            <div className="flex gap-1.5">
                                                                {checkout.map((d, i) => (
                                                                    <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${d.done ? 'text-green-700 bg-green-950 line-through' : 'text-green-300 bg-green-900'}`}>{d.notation}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="px-4 py-2.5 border-t border-amber-900/40 flex gap-2">
                                                        {[0, 1, 2].map(i => {
                                                            const dart = inProg?.dartsThrown[i]
                                                            return (
                                                                <div key={i} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${dart ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>
                                                                    {dart?.notation ?? '—'}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {liveLg.length > 0 && (
                                <div>
                                    {liveKo.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">League</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {liveLg.map(m => {
                                            const celebrating = celebratingMatches[m._id]
                                            if (celebrating) {
                                                return (
                                                    <div key={m._id}
                                                        className={`bg-gray-900 rounded-2xl border border-yellow-600 overflow-hidden transition-all duration-500 ${
                                                            celebrating.exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                                        }`}>
                                                        <div className="p-6 md:p-8 flex flex-col items-center justify-center gap-2 text-center min-h-[160px]">
                                                            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">Match Complete</p>
                                                            <p className="text-3xl md:text-4xl font-bold text-yellow-400 mt-1">{getName(celebrating.winnerId)}</p>
                                                            <p className="text-sm text-yellow-600 font-semibold">Winner!</p>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            const state = matchStates[m._id]
                                            const inProg = inProgressByMatch[m._id]
                                            const currentIdx = state?.currentLeg.currentPlayerIndex ?? 0
                                            const legsWon = state?.legsWon ?? m.legsWon ?? [0, 0]
                                            const getScore = (i: number) => i === currentIdx && inProg ? inProg.runningRemaining : (state?.currentLeg.remaining[i] ?? '—')
                                            const turnStartRem = inProg?.remainingBefore ?? (state?.currentLeg.remaining[currentIdx] ?? 0)
                                            const thrown = inProg?.dartsThrown.map(d => d.notation) ?? []
                                            const checkout = buildCheckoutDisplay(turnStartRem, thrown, inProg?.runningRemaining ?? (state?.currentLeg.remaining[currentIdx] ?? 0))
                                            return (
                                                <div key={m._id}
                                                    onClick={() => tournamentId && navigate(`/spectator/tournaments/${tournamentId}/matches/${m._id}`)}
                                                    className="bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 cursor-pointer overflow-hidden transition-colors">
                                                    <div className="p-4 md:p-5">
                                                        {m.board && <p className="text-xs text-gray-500 mb-2">Board {m.board}</p>}
                                                        <div className="flex items-center justify-between gap-2">
                                                            {m.players.map((playerId, i) => {
                                                                const score = getScore(i)
                                                                const isBust = i === currentIdx && typeof score === 'number' && score < 0
                                                                return (
                                                                    <div key={playerId} className={`flex-1 text-center ${i === currentIdx ? 'opacity-100' : 'opacity-40'}`}>
                                                                        <p className="text-xs md:text-sm text-gray-300 truncate mb-1">{getName(playerId)}</p>
                                                                        <p className={`text-4xl md:text-5xl font-bold tabular-nums ${isBust ? 'text-red-400' : ''}`}>{score}</p>
                                                                        <p className="text-xs text-gray-500 mt-1">{legsWon[i]}/{state?.rules.legsToWin ?? m.ruleLegsToWin ?? '?'} legs</p>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    {checkout && (
                                                        <div className="px-4 py-2 bg-green-950 border-t border-green-900 flex items-center justify-center gap-2">
                                                            <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">Checkout</span>
                                                            <div className="flex gap-1.5">
                                                                {checkout.map((d, i) => (
                                                                    <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${d.done ? 'text-green-700 bg-green-950 line-through' : 'text-green-300 bg-green-900'}`}>{d.notation}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="px-4 py-2.5 border-t border-gray-800 flex gap-2">
                                                        {[0, 1, 2].map(i => {
                                                            const dart = inProg?.dartsThrown[i]
                                                            return (
                                                                <div key={i} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${dart ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>
                                                                    {dart?.notation ?? '—'}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upcoming matches */}
                    {upcomingMatches.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Upcoming</p>

                            {upcomingKo.length > 0 && (
                                <div className={upcomingLg.length > 0 ? 'mb-3' : ''}>
                                    {upcomingLg.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">Knockout</p>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        {upcomingKo.map(m => (
                                            <div key={m._id} className="bg-gray-900 border border-amber-900/60 rounded-2xl px-4 py-3 flex items-center justify-between">
                                                <p className="font-medium text-sm">
                                                    {m.players.map((pid, i) => (
                                                        <span key={pid}>
                                                            {getName(pid)}
                                                            {i === 0 && <span className="text-gray-600 mx-2">vs</span>}
                                                        </span>
                                                    ))}
                                                </p>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    {m.board && <span className="text-xs text-gray-500">Board {m.board}</span>}
                                                    <span className="text-xs font-semibold text-amber-700 bg-amber-950/60 px-2 py-0.5 rounded-full">
                                                        {matchRoundLabel(m)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {upcomingLg.length > 0 && (
                                <div>
                                    {upcomingKo.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">League</p>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        {upcomingLg.map(m => (
                                            <div key={m._id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                                                <p className="font-medium text-sm">
                                                    {m.players.map((pid, i) => (
                                                        <span key={pid}>
                                                            {getName(pid)}
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
                        </div>
                    )}

                    {/* Completed matches */}
                    {completedMatches.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Completed</p>

                            {completedKo.length > 0 && (
                                <div className={completedLg.length > 0 ? 'mb-3' : ''}>
                                    {completedLg.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">Knockout</p>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        {completedKo.map(m => (
                                            <div key={m._id}
                                                onClick={() => tournamentId && navigate(`/spectator/tournaments/${tournamentId}/matches/${m._id}`)}
                                                className="bg-gray-900 border border-amber-900/60 hover:border-amber-800 cursor-pointer rounded-2xl px-4 py-3 flex items-center justify-between transition-colors">
                                                <div className="flex items-center gap-1 text-sm">
                                                    {m.players.map((pid, i) => (
                                                        <span key={pid} className={`font-medium ${m.winnerId === pid ? 'text-amber-400' : 'text-gray-500'}`}>
                                                            {getName(pid)}{i === 0 && <span className="text-gray-700 mx-2">vs</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    <span className="text-xs text-gray-500">{m.legsWon?.[0]}–{m.legsWon?.[1]}</span>
                                                    <span className="text-xs font-semibold text-amber-700 bg-amber-950/60 px-2 py-0.5 rounded-full">
                                                        {matchRoundLabel(m)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {completedLg.length > 0 && (
                                <div>
                                    {completedKo.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">League</p>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        {completedLg.map(m => (
                                            <div key={m._id}
                                                onClick={() => tournamentId && navigate(`/spectator/tournaments/${tournamentId}/matches/${m._id}`)}
                                                className="bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer rounded-2xl px-4 py-3 flex items-center justify-between transition-colors">
                                                <div className="flex items-center gap-1 text-sm">
                                                    {m.players.map((pid, i) => (
                                                        <span key={pid} className={`font-medium ${m.winnerId === pid ? 'text-white' : 'text-gray-500'}`}>
                                                            {getName(pid)}{i === 0 && <span className="text-gray-700 mx-2">vs</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500 shrink-0 ml-3">
                                                    {m.legsWon?.[0]}–{m.legsWon?.[1]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {liveMatches.length === 0 && upcomingMatches.length === 0 && completedMatches.length === 0 && (
                        <p className="text-gray-600 text-sm">No matches yet</p>
                    )}
                </div>

                {/* Standings — bottom on mobile, left sidebar on lg+ */}
                <div className="lg:w-72 xl:w-80 border-t border-gray-800 lg:border-t-0 lg:border-r p-4 md:p-6 order-2 lg:order-1">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Standings</p>
                        {tournamentId && (
                            <Link
                                to={`/stats/tournaments/${tournamentId}`}
                                className="text-xs text-gray-500 hover:text-white transition-colors">
                                Tournament Stats →
                            </Link>
                        )}
                    </div>
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
                                {(() => {
                                    const cutoff = tournament?.rules.knockoutSize ?? 4
                                    return standings.flatMap((s, i) => {
                                        const rows = []
                                        if (i === cutoff && cutoff < standings.length) {
                                            rows.push(
                                                <tr key="cutoff">
                                                    <td colSpan={6} className="p-0">
                                                        <div className="h-px bg-red-600" />
                                                    </td>
                                                </tr>
                                            )
                                        }
                                        rows.push(
                                            <tr
                                                key={s.playerId}
                                                onClick={() => navigate(`/stats/players/${s.playerId}`)}
                                                className={`hover:bg-gray-900 cursor-pointer transition-colors ${i > 0 && i !== cutoff ? 'border-t border-gray-800' : ''}`}>
                                                <td className="py-2 text-gray-500">{i + 1}</td>
                                                <td className="py-2 font-medium">{getName(s.playerId)}</td>
                                                <td className="py-2 text-center text-gray-400">{s.played}</td>
                                                <td className="py-2 text-center text-green-400">{s.won}</td>
                                                <td className="py-2 text-center text-red-400">{s.lost}</td>
                                                <td className="py-2 text-center font-bold">{s.points}</td>
                                            </tr>
                                        )
                                        return rows
                                    })
                                })()}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
