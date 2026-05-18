import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Player } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

export default function PlayerStatsList() {
    const navigate = useNavigate()
    const [players, setPlayers] = useState<Player[]>([])
    const [search, setSearch] = useState('')

    useEffect(() => {
        http.get<Player[]>('/players').then(r => setPlayers(r.data))
    }, [])

    const filtered = players.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.nickname ?? '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 py-6">
                <div className="mb-6"><HomeButton /></div>
                <h1 className="text-2xl font-bold mb-5">Player Stats</h1>

                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players…"
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-gray-600 transition-colors mb-4"
                />

                {filtered.length === 0 && (
                    <p className="text-gray-600 text-sm text-center py-6">
                        {players.length === 0 ? 'No players yet' : 'No players match your search'}
                    </p>
                )}

                <div className="flex flex-col gap-2">
                    {filtered.map(p => (
                        <button
                            key={p._id}
                            onClick={() => navigate(`/stats/players/${p._id}`)}
                            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-colors w-full">
                            <div className="w-9 h-9 rounded-full shrink-0" style={{ background: p.avatarColor }} />
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{p.name}</p>
                                {p.nickname && <p className="text-xs text-gray-500 truncate">{p.nickname}</p>}
                            </div>
                            <span className="text-gray-600 ml-auto text-lg">›</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
