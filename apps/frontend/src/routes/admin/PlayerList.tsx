import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Player } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

function randomHex(): string {
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

function isValidHex(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function PlayerList() {
    const navigate = useNavigate()
    const [players, setPlayers] = useState<Player[]>([])

    // Create form
    const [name, setName] = useState('')
    const [nickname, setNickname] = useState('')
    const [hexInput, setHexInput] = useState(randomHex())
    const [createError, setCreateError] = useState('')
    const [createLoading, setCreateLoading] = useState(false)

    // Edit modal
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
    const [editName, setEditName] = useState('')
    const [editNickname, setEditNickname] = useState('')
    const [editHex, setEditHex] = useState('')
    const [editError, setEditError] = useState('')
    const [editLoading, setEditLoading] = useState(false)

    const validColor = isValidHex(hexInput) ? hexInput : null
    const validEditColor = isValidHex(editHex) ? editHex : null

    function load() {
        http.get<Player[]>('/players').then(r => setPlayers(r.data))
    }

    useEffect(() => { load() }, [])

    function openEdit(player: Player) {
        setEditingPlayer(player)
        setEditName(player.name)
        setEditNickname(player.nickname ?? '')
        setEditHex(player.avatarColor)
        setEditError('')
    }

    async function saveEdit() {
        if (!editingPlayer) return
        if (!editName.trim()) return setEditError('Name is required')
        if (!validEditColor) return setEditError('Enter a valid hex color')
        setEditLoading(true)
        setEditError('')
        try {
            await http.patch(`/players/${editingPlayer._id}`, {
                name: editName.trim(),
                nickname: editNickname.trim() || undefined,
                avatarColor: validEditColor,
            })
            setEditingPlayer(null)
            load()
        } catch {
            setEditError('Failed to save changes')
        } finally {
            setEditLoading(false)
        }
    }

    async function createPlayer() {
        if (!name.trim()) return setCreateError('Name is required')
        if (!validColor) return setCreateError('Enter a valid hex color')
        setCreateLoading(true)
        setCreateError('')
        try {
            await http.post('/players', { name: name.trim(), nickname: nickname.trim() || undefined, avatarColor: validColor })
            setName('')
            setNickname('')
            setHexInput(randomHex())
            load()
        } catch {
            setCreateError('Failed to create player')
        } finally {
            setCreateLoading(false)
        }
    }

    async function deletePlayer(id: string) {
        try {
            await http.delete(`/players/${id}`)
            load()
        } catch {
            setCreateError('Failed to delete player')
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 py-6">
                <div className="flex items-center gap-3 flex-wrap mb-6">
                    <HomeButton />
                    <span className="text-gray-700">·</span>
                    <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-white text-sm transition-colors">Admin</button>
                </div>

                <h1 className="text-2xl font-bold mb-5">Players</h1>

                {/* Add player form */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Add Player</p>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createPlayer()}
                        placeholder="Name *"
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"
                    />
                    <input
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createPlayer()}
                        placeholder="Nickname (optional)"
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"
                    />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl shrink-0 border border-gray-700"
                            style={{ background: validColor ?? '#374151' }} />
                        <input
                            value={hexInput}
                            onChange={e => setHexInput(e.target.value)}
                            placeholder="#rrggbb"
                            maxLength={7}
                            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 font-mono flex-1 min-w-0 transition-colors"
                        />
                        <button onClick={() => setHexInput(randomHex())}
                            className="text-sm text-gray-500 hover:text-white transition-colors shrink-0 px-1">
                            Random
                        </button>
                    </div>
                    {createError && <p className="text-red-400 text-sm">{createError}</p>}
                    <button onClick={createPlayer} disabled={createLoading}
                        className="bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 py-3 rounded-xl font-semibold transition-colors w-full">
                        {createLoading ? 'Adding…' : 'Add Player'}
                    </button>
                </div>

                {/* Player list */}
                <div className="flex flex-col gap-2">
                    {players.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">No players yet</p>
                    )}
                    {players.map(p => (
                        <div key={p._id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full shrink-0" style={{ background: p.avatarColor }} />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{p.name}</p>
                                    {p.nickname && <p className="text-xs text-gray-500 truncate">{p.nickname}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => openEdit(p)}
                                    className="text-gray-500 hover:text-white text-sm px-2 py-1 transition-colors">
                                    Edit
                                </button>
                                <button
                                    onClick={() => deletePlayer(p._id)}
                                    className="text-gray-600 hover:text-red-400 text-sm px-2 py-1 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit modal */}
            {editingPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3">
                        <h2 className="text-lg font-bold">Edit Player</h2>
                        <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            placeholder="Name *"
                            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"
                        />
                        <input
                            value={editNickname}
                            onChange={e => setEditNickname(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            placeholder="Nickname (optional)"
                            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"
                        />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl shrink-0 border border-gray-700"
                                style={{ background: validEditColor ?? '#374151' }} />
                            <input
                                value={editHex}
                                onChange={e => setEditHex(e.target.value)}
                                placeholder="#rrggbb"
                                maxLength={7}
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 font-mono flex-1 min-w-0 transition-colors"
                            />
                            <button onClick={() => setEditHex(randomHex())}
                                className="text-sm text-gray-500 hover:text-white transition-colors shrink-0 px-1">
                                Random
                            </button>
                        </div>
                        {editError && <p className="text-red-400 text-sm">{editError}</p>}
                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={() => setEditingPlayer(null)}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={editLoading}
                                className="flex-1 bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-xl transition-colors">
                                {editLoading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
