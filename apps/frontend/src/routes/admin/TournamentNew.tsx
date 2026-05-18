import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Player } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

export default function TournamentNew() {
    const navigate = useNavigate()
    const [players, setPlayers] = useState<Player[]>([])
    const [name, setName] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [knockoutSize, setKnockoutSize] = useState<4 | 8>(4)
    const [boardCount, setBoardCount] = useState(2)
    const [error, setError] = useState('')

    useEffect(() => {
        http.get<Player[]>('/players').then(r => setPlayers(r.data))
    }, [])

    function togglePlayer(id: string) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    async function submit() {
        if (!name.trim()) return setError('Tournament name is required')
        if (selectedIds.length < 4) return setError('Select at least 4 players')
        try {
            await http.post('/tournaments', {
                name: name.trim(),
                playerIds: selectedIds,
                rules: { startingScore: 501, doubleIn: false, doubleOut: true, groupLegsToWin: 2, knockoutLegsToWin: 3, boardCount, knockoutSize },
            })
            navigate('/admin')
        } catch {
            setError('Failed to create tournament')
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <HomeButton />
                    <span className="text-gray-700">·</span>
                    <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-white text-sm transition-colors">Admin</button>
                </div>

                <h1 className="text-2xl font-bold mb-6">New Tournament</h1>

                <div className="flex flex-col gap-4">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Tournament name"
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Boards</span>
                            <select value={boardCount} onChange={e => setBoardCount(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none">
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Knockout</span>
                            <select value={knockoutSize} onChange={e => setKnockoutSize(Number(e.target.value) as 4 | 8)}
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none">
                                <option value={4}>Top 4</option>
                                <option value={8}>Top 8</option>
                            </select>
                        </label>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                            Players <span className="text-gray-400 normal-case">({selectedIds.length} selected)</span>
                        </p>
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                            {players.map(p => (
                                <div key={p._id} onClick={() => togglePlayer(p._id)}
                                    className={`cursor-pointer rounded-xl px-4 py-3 flex items-center gap-3 border transition-colors ${
                                        selectedIds.includes(p._id)
                                            ? 'bg-gray-800 border-white/20'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                    }`}>
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.avatarColor }} />
                                    <span className="font-medium">{p.name}</span>
                                    {selectedIds.includes(p._id) && <span className="ml-auto text-white text-xs">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => navigate('/admin')}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 py-3 rounded-xl font-semibold transition-colors">
                            Cancel
                        </button>
                        <button onClick={submit}
                            className="flex-1 bg-white hover:bg-gray-200 text-gray-950 py-3 rounded-xl font-semibold transition-colors">
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
