import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import http from '../../api/client'
import { usePlayers } from '../../hooks/usePlayers'
import BackButton from '../../components/ui/BackButton'

interface StatEntry {
    playerId: string
    average: number
    highestCheckout: number
    checkoutRate: number
    oneEighties: number
    bestLegDarts: number
    hundredPlus: number
    hundredFortyPlus: number
}

interface TournamentStatsResponse {
    tournamentId: string
    tournamentName: string
    totalMatches: number
    allEntries: StatEntry[]
    highestAverage: StatEntry[] | null
    highestCheckout: StatEntry[] | null
    bestCheckoutRate: StatEntry[] | null
    bestLeg: StatEntry[] | null
    most180s: StatEntry[] | null
    most100Plus: StatEntry[] | null
    most140Plus: StatEntry[] | null
}

type StatKey = keyof Omit<TournamentStatsResponse, 'tournamentId' | 'tournamentName' | 'totalMatches' | 'allEntries'>

interface StatConfig {
    key: StatKey
    icon: string
    label: string
    valueKey: keyof StatEntry
    format: (v: number) => string
    asc: boolean
}

const STAT_CONFIGS: StatConfig[] = [
    { key: 'highestAverage',   icon: '🎯', label: 'Highest Average',     valueKey: 'average',          format: v => String(v),    asc: false },
    { key: 'highestCheckout',  icon: '✅', label: 'Highest Checkout',    valueKey: 'highestCheckout',  format: v => String(v),    asc: false },
    { key: 'bestCheckoutRate', icon: '📊', label: 'Best Checkout Rate',  valueKey: 'checkoutRate',     format: v => `${v}%`,      asc: false },
    { key: 'bestLeg',          icon: '⚡', label: 'Best Leg',            valueKey: 'bestLegDarts',     format: v => `${v} darts`, asc: true  },
    { key: 'most180s',         icon: '💯', label: 'Most 180s',           valueKey: 'oneEighties',      format: v => String(v),    asc: false },
    { key: 'most140Plus',      icon: '🔥', label: 'Most 140+',           valueKey: 'hundredFortyPlus', format: v => String(v),    asc: false },
    { key: 'most100Plus',      icon: '💥', label: 'Most 100+',           valueKey: 'hundredPlus',      format: v => String(v),    asc: false },
]

function StatRow({ icon, label, playerNames, value, onClick }: {
    icon: string
    label: string
    playerNames: string[]
    value: string
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex items-center gap-4 ${onClick ? 'hover:border-gray-700 cursor-pointer transition-colors' : ''}`}
        >
            <span className="text-2xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-semibold truncate">{playerNames.join(', ')}</p>
            </div>
            <p className="text-xl font-bold tabular-nums shrink-0">{value}</p>
        </div>
    )
}

function rankColor(rank: number) {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-gray-300'
    if (rank === 3) return 'text-amber-600'
    return 'text-gray-600'
}

export default function TournamentStatsPage() {
    const { id } = useParams<{ id: string }>()
    const { getName } = usePlayers()
    const [data, setData] = useState<TournamentStatsResponse | null>(null)
    const [error, setError] = useState(false)
    const [selectedStat, setSelectedStat] = useState<StatConfig | null>(null)

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

    if (selectedStat) {
        const { icon, label, valueKey, format, asc } = selectedStat
        const sorted = [...data.allEntries]
            .filter(e => (e[valueKey] as number) > 0)
            .sort((a, b) => asc
                ? (a[valueKey] as number) - (b[valueKey] as number)
                : (b[valueKey] as number) - (a[valueKey] as number)
            )

        let rank = 1
        const ranked = sorted.map((entry, i) => {
            if (i > 0 && (entry[valueKey] as number) !== (sorted[i - 1][valueKey] as number)) rank = i + 1
            return { ...entry, rank }
        })

        return (
            <div className="min-h-screen bg-gray-950 text-white">
                <div className="max-w-lg mx-auto px-4 pb-6"
                    style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                    <div className="mb-6">
                        <button
                            onClick={() => setSelectedStat(null)}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            ← Back to Stats
                        </button>
                    </div>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">{icon} {label}</h1>
                        <p className="text-gray-500 text-sm mt-0.5">{data.tournamentName}</p>
                    </div>
                    {ranked.length === 0 ? (
                        <p className="text-gray-600 text-sm">No data yet</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {ranked.map(entry => (
                                <div key={entry.playerId}
                                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
                                    <span className={`text-lg font-bold tabular-nums w-8 shrink-0 ${rankColor(entry.rank)}`}>
                                        {entry.rank}.
                                    </span>
                                    <span className="flex-1 font-medium">{getName(entry.playerId)}</span>
                                    <span className="text-lg font-bold tabular-nums">{format(entry[valueKey] as number)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 pb-6"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div className="mb-6"><BackButton label="Back" /></div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{data.tournamentName}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{data.totalMatches} completed match{data.totalMatches !== 1 ? 'es' : ''}</p>
                </div>

                {data.totalMatches === 0 ? (
                    <p className="text-gray-600 text-sm">No completed matches yet</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {STAT_CONFIGS.map(config => {
                            const winners = data[config.key] as StatEntry[] | null
                            if (!winners || winners.length === 0) return null
                            return (
                                <StatRow
                                    key={config.key}
                                    icon={config.icon}
                                    label={config.label}
                                    playerNames={winners.map(e => getName(e.playerId))}
                                    value={config.format(winners[0][config.valueKey] as number)}
                                    onClick={() => setSelectedStat(config)}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
