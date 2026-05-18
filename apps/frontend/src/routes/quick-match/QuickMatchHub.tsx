import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Match } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'
import { usePlayers } from '../../hooks/usePlayers'

export default function QuickMatchHub() {
    const navigate = useNavigate()
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmDelete, setConfirmDelete] = useState<Match | null>(null)
    const { getName } = usePlayers()

    function load() {
        http.get<Match[]>('/matches?isQuickMatch=true&status=active')
            .then(r => setMatches(r.data))
            .catch(() => setMatches([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    async function deleteMatch(match: Match) {
        setConfirmDelete(null)
        await http.delete(`/matches/quick/${match._id}`).catch(() => {})
        load()
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <div className="bg-gray-900 border-b border-gray-800 px-4 pb-4"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="mb-3"><BackButton to="/" label="Home" /></div>
                <h1 className="text-xl font-bold">Quick Match</h1>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-4">
                <button
                    onClick={() => navigate('/quick-match/new')}
                    className="bg-white hover:bg-gray-100 text-gray-950 font-semibold py-4 rounded-2xl text-base transition-colors w-full">
                    New Quick Match
                </button>

                {loading ? (
                    <p className="text-gray-500 text-center text-sm mt-4">Loading…</p>
                ) : matches.length === 0 ? (
                    <p className="text-gray-600 text-center text-sm mt-4">No active quick matches</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Matches</h2>
                        {matches.map(match => (
                            <div key={match._id}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-semibold text-sm truncate">
                                        {match.players.map(p => getName(p)).join(' vs ')}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {match.ruleStartingScore ?? 501} · Leg {match.currentLegNumber}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => navigate(`/judge/matches/${match._id}`)}
                                        className="bg-white hover:bg-gray-100 text-gray-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                                        Join
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(match)}
                                        className="text-gray-500 hover:text-red-400 text-sm px-2 py-2 transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                        <h2 className="text-lg font-bold mb-2">Delete match?</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            {confirmDelete.players.map(p => getName(p)).join(' vs ')} will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => deleteMatch(confirmDelete)}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
