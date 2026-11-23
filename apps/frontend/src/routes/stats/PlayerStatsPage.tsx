import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import http from '../../api/client'
import type { Player } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'

interface PlayerStats {
    matchesPlayed: number
    matchesWon: number
    legsWon: number
    dartsThrown: number
    turnScoreTotal: number
    checkoutAttempts: number
    checkoutHits: number
    oneEighties: number
    hundredPlus: number
    hundredFortyPlus: number
    highestCheckout: number
    bestLegDarts: number
    average: number
    checkoutRate: number
}

interface TournamentHistoryEntry {
    tournamentId: string
    tournamentName: string
    status: string
    placement: number | null
    matchesPlayed: number
    matchesWon: number
    legsWon: number
    average: number
    highestCheckout: number
    date: string
    isQuickMatch: boolean
}

interface PlayerStatsResponse {
    player: Player
    stats: PlayerStats
    tournamentHistory: TournamentHistoryEntry[]
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
        </div>
    )
}

function placement(n: number | null) {
    if (!n) return '—'
    const s = ['', 'st', 'nd', 'rd']
    return `${n}${s[n] ?? 'th'}`
}

export default function PlayerStatsPage() {
    const { id } = useParams<{ id: string }>()
    const [data, setData] = useState<PlayerStatsResponse | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!id) return
        setError(false)
        http.get<PlayerStatsResponse>(`/stats/player/${id}`)
            .then(r => setData(r.data))
            .catch(() => setError(true))
    }, [id])

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center flex-col gap-3">
                <p className="text-gray-400">Could not load player stats</p>
                <BackButton label="Back" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        )
    }

    const { player, stats, tournamentHistory } = data

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 pb-6"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div className="mb-6"><BackButton label="Back" /></div>

                {/* Player header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full shrink-0" style={{ background: player.avatarColor }} />
                    <div>
                        <h1 className="text-2xl font-bold">{player.name}</h1>
                        {player.nickname && <p className="text-gray-500 text-sm">{player.nickname}</p>}
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <StatCard label="3-dart avg" value={stats.average} />
                    <StatCard label="Highest CO" value={stats.highestCheckout || '—'} />
                    <StatCard label="CO Rate" value={stats.checkoutAttempts > 0 ? `${stats.checkoutRate}%` : '—'} />
                    <StatCard label="180s" value={stats.oneEighties} />
                    <StatCard label="100+ turns" value={stats.hundredPlus ?? 0} />
                    <StatCard label="140+ turns" value={stats.hundredFortyPlus ?? 0} />
                    <StatCard
                        label="Best leg"
                        value={stats.bestLegDarts || '—'}
                        sub={stats.bestLegDarts ? 'darts' : undefined}
                    />
                    <StatCard
                        label="Matches"
                        value={`${stats.matchesWon}/${stats.matchesPlayed}`}
                        sub="won / played"
                    />
                </div>

                {/* Match history */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Match History</p>
                {tournamentHistory.length === 0 ? (
                    <p className="text-gray-600 text-sm">No completed matches</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {tournamentHistory.map(t => (
                            <div key={t.tournamentId} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="font-semibold text-sm truncate">{t.tournamentName}</p>
                                        {t.isQuickMatch && (
                                            <span className="text-xs text-blue-400 bg-blue-950/50 border border-blue-900/50 px-1.5 py-0.5 rounded-full shrink-0">Quick</span>
                                        )}
                                    </div>
                                    {!t.isQuickMatch && t.placement && (
                                        <span className="text-xs font-bold text-yellow-400 shrink-0">{placement(t.placement)}</span>
                                    )}
                                </div>
                                <div className="flex gap-4 text-xs text-gray-500">
                                    <span>{t.matchesWon}/{t.matchesPlayed} matches</span>
                                    <span>{t.legsWon} legs</span>
                                    <span>avg {t.average}</span>
                                    {t.highestCheckout > 0 && <span>CO {t.highestCheckout}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
