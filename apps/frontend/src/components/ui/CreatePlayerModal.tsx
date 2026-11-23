import { useState } from 'react'
import http from '../../api/client'
import type { Player } from '@dart/shared'

function randomHex(): string {
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

function isValidHex(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function CreatePlayerModal({ onClose, onCreated }: {
    onClose: () => void
    onCreated: (player: Player) => void
}) {
    const [name, setName] = useState('')
    const [nickname, setNickname] = useState('')
    const [hexInput, setHexInput] = useState(() => randomHex())
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const validColor = isValidHex(hexInput) ? hexInput : null

    async function submit() {
        if (!name.trim()) return setError('Name is required')
        if (!validColor) return setError('Enter a valid hex color')
        setLoading(true)
        setError('')
        try {
            const res = await http.post<Player>('/players', {
                name: name.trim(),
                nickname: nickname.trim() || undefined,
                avatarColor: validColor,
            })
            onCreated(res.data)
        } catch {
            setError('Failed to create player')
            setLoading(false)
        }
    }

    const inputCls = "bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-500 transition-colors w-full"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3">
                <h2 className="text-lg font-bold text-white">New Player</h2>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="Name *"
                    autoFocus
                    className={inputCls}
                />
                <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="Nickname (optional)"
                    className={inputCls}
                />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl shrink-0 border border-gray-700"
                        style={{ background: validColor ?? '#374151' }} />
                    <input
                        value={hexInput}
                        onChange={e => setHexInput(e.target.value)}
                        placeholder="#rrggbb"
                        maxLength={7}
                        className={`${inputCls} font-mono`}
                        style={{ flex: 1 }}
                    />
                    <button onClick={() => setHexInput(randomHex())}
                        className="text-sm text-gray-500 hover:text-white transition-colors shrink-0 px-1">
                        Random
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3 mt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="flex-1 bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-xl transition-colors">
                        {loading ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    )
}
