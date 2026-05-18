import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { usePlayers } from '../../hooks/usePlayers'

interface StatEntry {
    playerId: string
    average: number
    highestCheckout: number
    checkoutRate: number
    oneEighties: number
    bestLegDarts: number
}

interface TournamentStatsResponse {
    tournamentId: string
    tournamentName: string
    totalMatches: number
    highestAverage: StatEntry | null
    highestCheckout: StatEntry | null
    bestCheckoutRate: StatEntry | null
    bestLeg: StatEntry | null
    most180s: StatEntry | null
}

function StatRow({ icon, label, playerName, value, onClick }: {
    icon: string
    label: string
    playerName: string
    value: string
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex items-center gap-4 ${onClick ? 'hover:border-gray-700 cursor-pointer transition-colors' : ''}`}>
            <span className="text-2xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-semibold truncate">{playerName}</p>
            </div>
            <p className="text-xl font-bold tabular-nums shrink-0">{value}</p>
        </div>
    )
}

export default function TournamentStatsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { getName } = usePlayers()
    const [data, setData] = useState<TournamentStatsResponse | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!id) return
        setError(false)
        http.get<TournamentStatsResponse>(`/stats/tournament/${id}`)
            .then(r => setData(r.data))
            .catch(() => setError(true))
    }, [id])

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center flex-col gap-3">
                <p className="text-gray-400">Could not load tournament stats</p>
                <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-white text-sm transition-colors">← Back</button>
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

    const goToPlayer = (playerId: string) => navigate(`/stats/players/${playerId}`)

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 py-6">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-500 hover:text-white text-sm transition-colors mb-6">
                    ← Back
                </button>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{data.tournamentName}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{data.totalMatches} completed match{data.totalMatches !== 1 ? 'es' : ''}</p>
                </div>

                {data.totalMatches === 0 ? (
                    <p className="text-gray-600 text-sm">No completed matches yet</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {data.highestAverage && (
                            <StatRow
                                icon="🎯"
                                label="Highest Average"
                                playerName={getName(data.highestAverage.playerId)}
                                value={String(data.highestAverage.average)}
                                onClick={() => goToPlayer(data.highestAverage!.playerId)}
                            />
                        )}
                        {data.highestCheckout && (
                            <StatRow
                                icon="✅"
                                label="Highest Checkout"
                                playerName={getName(data.highestCheckout.playerId)}
                                value={String(data.highestCheckout.highestCheckout)}
                                onClick={() => goToPlayer(data.highestCheckout!.playerId)}
                            />
                        )}
                        {data.bestCheckoutRate && (
                            <StatRow
                                icon="📊"
                                label="Best Checkout Rate"
                                playerName={getName(data.bestCheckoutRate.playerId)}
                                value={`${data.bestCheckoutRate.checkoutRate}%`}
                                onClick={() => goToPlayer(data.bestCheckoutRate!.playerId)}
                            />
                        )}
                        {data.bestLeg && (
                            <StatRow
                                icon="⚡"
                                label="Best Leg"
                                playerName={getName(data.bestLeg.playerId)}
                                value={`${data.bestLeg.bestLegDarts} darts`}
                                onClick={() => goToPlayer(data.bestLeg!.playerId)}
                            />
                        )}
                        {data.most180s && data.most180s.oneEighties > 0 && (
                            <StatRow
                                icon="💯"
                                label="Most 180s"
                                playerName={getName(data.most180s.playerId)}
                                value={String(data.most180s.oneEighties)}
                                onClick={() => goToPlayer(data.most180s!.playerId)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
