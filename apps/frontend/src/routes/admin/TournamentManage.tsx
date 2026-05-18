import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { useTournamentStore } from '../../stores/tournament.store'
import { usePlayers } from '../../hooks/usePlayers'
import type { Match, Tournament } from '@dart/shared'
import { MatchStatus, TournamentStatus } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
    onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-lg font-bold mb-2">{title}</h2>
                <p className="text-gray-400 text-sm mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

function statusBadge(m: Match) {
    if (m.status === MatchStatus.Completed) {
        const winner = m.winnerId === m.players[0] ? 0 : 1
        const score = winner === 0
            ? `${m.legsWon[0]}–${m.legsWon[1]}`
            : `${m.legsWon[0]}–${m.legsWon[1]}`
        return <span className="text-xs text-gray-500 tabular-nums">{score}</span>
    }
    if (m.status === MatchStatus.Active) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Live
            </span>
        )
    }
    return null
}

export default function TournamentManage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { setActiveTournament, activeTournament } = useTournamentStore()
    const { getName } = usePlayers()
    const [matchDocs, setMatchDocs] = useState<Match[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [confirmStart, setConfirmStart] = useState<Match | null>(null)
    const [confirmReset, setConfirmReset] = useState<Match | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

    function refreshMatches() {
        http.get<Tournament>(`/tournaments/${id}`).then(r => setActiveTournament(r.data))
        http.get<Match[]>(`/matches?tournamentId=${id}`).then(r => setMatchDocs(r.data))
    }

    useEffect(() => { refreshMatches() }, [id])

    const matchMap = new Map(matchDocs.map(m => [m._id, m]))

    async function startMatch(match: Match, startingPlayerIndex: 0 | 1) {
        setBusy(match._id)
        setConfirmStart(null)
        try {
            await http.post(`/matches/${match._id}/start`, { startingPlayerIndex })
            refreshMatches()
        } catch {
            setError('Failed to start match')
        } finally {
            setBusy(null)
        }
    }

    async function resetMatch(match: Match) {
        setBusy(match._id)
        setConfirmReset(null)
        try {
            await http.post(`/matches/${match._id}/reset`)
            refreshMatches()
        } catch {
            setError('Failed to reset match')
        } finally {
            setBusy(null)
        }
    }

    async function startTournament() {
        setLoading(true)
        setError('')
        try {
            const r = await http.post<Tournament>(`/tournaments/${id}/start`)
            setActiveTournament(r.data)
            const mr = await http.get<Match[]>(`/matches?tournamentId=${id}`)
            setMatchDocs(mr.data)
        } catch {
            setError('Failed to start tournament')
        } finally {
            setLoading(false)
        }
    }

    if (!activeTournament) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        )
    }

    const t = activeTournament

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 flex-wrap mb-6">
                    <HomeButton />
                    <span className="text-gray-700">·</span>
                    <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-white text-sm transition-colors">Admin</button>
                </div>

                <div className="flex items-center justify-between mb-6 gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold truncate">{t.name}</h1>
                        <span className={`text-xs font-semibold uppercase tracking-wider mt-1 inline-block ${
                            t.status === 'active' ? 'text-green-400' : 'text-gray-500'
                        }`}>{t.status}</span>
                    </div>
                    {t.status === TournamentStatus.Draft && (
                        <button onClick={startTournament} disabled={loading}
                            className="shrink-0 bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                            {loading ? 'Starting…' : 'Start Tournament'}
                        </button>
                    )}
                </div>

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                {/* Standings */}
                {t.standings.length > 0 && (
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Standings</p>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                                        <th className="text-left px-4 py-3">#</th>
                                        <th className="text-left px-4 py-3">Player</th>
                                        <th className="text-center px-3 py-3">P</th>
                                        <th className="text-center px-3 py-3">W</th>
                                        <th className="text-center px-3 py-3">L</th>
                                        <th className="text-center px-3 py-3">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const cutoff = t.rules.knockoutSize ?? 4
                                        return t.standings.flatMap((s, i) => {
                                            const rows = []
                                            if (i === cutoff && cutoff < t.standings.length) {
                                                rows.push(
                                                    <tr key="cutoff">
                                                        <td colSpan={6} className="p-0">
                                                            <div className="h-px bg-red-600" />
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            rows.push(
                                                <tr key={s.playerId} className={i > 0 && i !== cutoff ? 'border-t border-gray-800' : ''}>
                                                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                                    <td className="px-4 py-3 font-medium">{getName(s.playerId)}</td>
                                                    <td className="px-3 py-3 text-center text-gray-400">{s.played}</td>
                                                    <td className="px-3 py-3 text-center text-green-400">{s.won}</td>
                                                    <td className="px-3 py-3 text-center text-red-400">{s.lost}</td>
                                                    <td className="px-3 py-3 text-center font-bold">{s.points}</td>
                                                </tr>
                                            )
                                            return rows
                                        })
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Matches — flat list */}
                {t.leagueRounds.length > 0 && (() => {
                    const allSlots = t.leagueRounds.flatMap(r => r.matches)
                    return (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Matches</p>
                            <div className="flex flex-col gap-2">
                                {allSlots.map(sm => {
                                    const match = matchMap.get(sm.matchId)
                                    const isBusy = busy === sm.matchId
                                    return (
                                        <div key={sm.matchId}
                                            className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm truncate">
                                                    {match
                                                        ? match.players.map(pid => getName(pid)).join(' vs ')
                                                        : `Match ${sm.matchOrder}`
                                                    }
                                                </p>
                                                {match && <div className="mt-0.5">{statusBadge(match)}</div>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {match?.status === MatchStatus.Pending && (
                                                    <button
                                                        onClick={() => setConfirmStart(match)}
                                                        disabled={isBusy}
                                                        className="text-xs bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                                                        {isBusy ? '…' : 'Start'}
                                                    </button>
                                                )}
                                                {(match?.status === MatchStatus.Active || match?.status === MatchStatus.Completed) && (
                                                    <button
                                                        onClick={() => setConfirmReset(match)}
                                                        disabled={isBusy}
                                                        className="text-xs bg-gray-800 hover:bg-red-950 hover:text-red-400 disabled:opacity-50 text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                                                        {isBusy ? '…' : 'Reset'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/judge/matches/${sm.matchId}`)}
                                                    className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}
            </div>

        {/* Who throws first? */}
        {confirmStart && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
                    <h2 className="text-lg font-bold mb-1">Who throws first?</h2>
                    <p className="text-gray-500 text-sm mb-5">
                        {confirmStart.players.map(pid => getName(pid)).join(' vs ')}
                    </p>
                    <div className="flex flex-col gap-3">
                        {confirmStart.players.map((pid, i) => (
                            <button key={pid}
                                onClick={() => startMatch(confirmStart, i as 0 | 1)}
                                className="bg-gray-800 hover:bg-white hover:text-gray-950 border border-gray-700 hover:border-white rounded-xl py-4 font-semibold transition-colors">
                                {getName(pid)}
                            </button>
                        ))}
                        <button onClick={() => setConfirmStart(null)}
                            className="text-gray-600 hover:text-white text-sm py-2 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {confirmReset && (
            <ConfirmModal
                title="Reset match?"
                message={`Reset ${confirmReset.players.map(pid => getName(pid)).join(' vs ')}? All scores will be deleted and the match returns to upcoming.`}
                confirmLabel="Reset"
                onConfirm={() => resetMatch(confirmReset)}
                onCancel={() => setConfirmReset(null)}
            />
        )}
        </div>
    )
}
