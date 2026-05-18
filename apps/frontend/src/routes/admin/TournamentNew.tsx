import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Player } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-white' : 'bg-gray-700'}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${value ? 'translate-x-4 bg-gray-950' : 'translate-x-0 bg-gray-400'}`} />
        </button>
    )
}

export default function TournamentNew() {
    const navigate = useNavigate()
    const [players, setPlayers] = useState<Player[]>([])
    const [name, setName] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [knockoutSize, setKnockoutSize] = useState<4 | 8>(4)
    const [boardCount, setBoardCount] = useState('2')
    const [startingScore, setStartingScore] = useState<301 | 501 | 701>(501)
    const [doubleIn, setDoubleIn] = useState(false)
    const [doubleOut, setDoubleOut] = useState(true)
    const [groupLegsToWin, setGroupLegsToWin] = useState('2')
    const [knockoutLegsToWin, setKnockoutLegsToWin] = useState('3')
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
        const boards = parseInt(boardCount)
        if (!boards || boards < 1) return setError('Board count must be at least 1')
        const lgLegs = parseInt(groupLegsToWin)
        if (!lgLegs || lgLegs < 1) return setError('League legs to win must be at least 1')
        const koLegs = parseInt(knockoutLegsToWin)
        if (!koLegs || koLegs < 1) return setError('Knockout legs to win must be at least 1')
        try {
            await http.post('/tournaments', {
                name: name.trim(),
                playerIds: selectedIds,
                rules: {
                    startingScore,
                    doubleIn,
                    doubleOut,
                    groupLegsToWin: lgLegs,
                    knockoutLegsToWin: koLegs,
                    boardCount: boards,
                    knockoutSize,
                },
            })
            navigate('/admin')
        } catch {
            setError('Failed to create tournament')
        }
    }

    const inputClass = "bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 pb-6"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div className="mb-6">
                    <BackButton to="/admin" label="Admin" />
                </div>

                <h1 className="text-2xl font-bold mb-6">New Tournament</h1>

                <div className="flex flex-col gap-4 animate-slide-up">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Tournament name"
                        className={inputClass}
                    />

                    {/* Starting score */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Starting Score</span>
                        <div className="grid grid-cols-3 gap-2">
                            {([301, 501, 701] as const).map(s => (
                                <button key={s} type="button" onClick={() => setStartingScore(s)}
                                    className={`py-3 rounded-xl font-semibold text-sm transition-colors border ${
                                        startingScore === s
                                            ? 'bg-white text-gray-950 border-white'
                                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
                                    }`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Boards + Knockout size */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Boards</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={boardCount}
                                onChange={e => setBoardCount(e.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Knockout</span>
                            <select value={knockoutSize} onChange={e => setKnockoutSize(Number(e.target.value) as 4 | 8)}
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none h-full">
                                <option value={4}>Top 4</option>
                                <option value={8}>Top 8</option>
                            </select>
                        </label>
                    </div>

                    {/* Legs to win */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">League legs</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={groupLegsToWin}
                                onChange={e => setGroupLegsToWin(e.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Knockout legs</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={knockoutLegsToWin}
                                onChange={e => setKnockoutLegsToWin(e.target.value)}
                                className={inputClass}
                            />
                        </label>
                    </div>

                    {/* Double in / Double out */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                                <p className="font-medium text-sm">Double In</p>
                                <p className="text-xs text-gray-500">Must hit a double to start scoring</p>
                            </div>
                            <Toggle value={doubleIn} onChange={setDoubleIn} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                                <p className="font-medium text-sm">Double Out</p>
                                <p className="text-xs text-gray-500">Must finish on a double or bullseye</p>
                            </div>
                            <Toggle value={doubleOut} onChange={setDoubleOut} />
                        </div>
                    </div>

                    {/* Player selection */}
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
