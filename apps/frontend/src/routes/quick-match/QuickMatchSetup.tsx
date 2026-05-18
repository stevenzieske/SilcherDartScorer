import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import type { Match, Player } from '@dart/shared'
import HomeButton from '../../components/ui/HomeButton'

type Step = 'players' | 'settings' | 'order'

interface Settings {
    startingScore: 301 | 501 | 701
    doubleIn: boolean
    doubleOut: boolean
    legsToWin: number
    setsToWin: number
}

function Stepper({
    value,
    min,
    onChange,
}: {
    value: number
    min: number
    onChange: (v: number) => void
}) {
    return (
        <div className="flex items-center gap-3">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold flex items-center justify-center transition-colors">
                −
            </button>
            <span className="text-white font-bold text-lg w-6 text-center tabular-nums">{value}</span>
            <button
                onClick={() => onChange(value + 1)}
                className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold flex items-center justify-center transition-colors">
                +
            </button>
        </div>
    )
}

export default function QuickMatchSetup() {
    const navigate = useNavigate()
    const [step, setStep] = useState<Step>('players')
    const [allPlayers, setAllPlayers] = useState<Player[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [settings, setSettings] = useState<Settings>({
        startingScore: 501,
        doubleIn: false,
        doubleOut: true,
        legsToWin: 2,
        setsToWin: 0,
    })
    const [orderedPlayers, setOrderedPlayers] = useState<Player[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        http.get<Player[]>('/players')
            .then(r => setAllPlayers(r.data))
            .catch(() => {})
    }, [])

    function togglePlayer(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    function proceedToSettings() {
        const players = allPlayers.filter(p => selectedIds.includes(p._id))
        setOrderedPlayers(players)
        setStep('settings')
    }

    function proceedToOrder() {
        setStep('order')
    }

    function moveUp(index: number) {
        if (index === 0) return
        setOrderedPlayers(prev => {
            const next = [...prev]
            ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
            return next
        })
    }

    function moveDown(index: number) {
        setOrderedPlayers(prev => {
            if (index >= prev.length - 1) return prev
            const next = [...prev]
            ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
            return next
        })
    }

    function randomOrder() {
        setOrderedPlayers(prev => {
            const next = [...prev]
            for (let i = next.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[next[i], next[j]] = [next[j], next[i]]
            }
            return next
        })
    }

    async function startMatch() {
        setSubmitting(true)
        setError('')
        try {
            const res = await http.post<Match>('/matches/quick', {
                players: orderedPlayers.map(p => p._id),
                startingScore: settings.startingScore,
                doubleIn: settings.doubleIn,
                doubleOut: settings.doubleOut,
                legsToWin: settings.legsToWin,
                setsToWin: settings.setsToWin,
            })
            navigate(`/judge/matches/${res.data._id}`)
        } catch {
            setError('Failed to create match. Please try again.')
            setSubmitting(false)
        }
    }

    // Step 1 — Player selection
    if (step === 'players') {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col">
                <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-4">
                    <div className="mb-3"><HomeButton /></div>
                    <h1 className="text-xl font-bold">New Quick Match</h1>
                    <p className="text-gray-500 text-xs mt-1">Step 1 of 3 — Select players</p>
                </div>

                <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                    {allPlayers.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center mt-4">Loading players…</p>
                    ) : (
                        allPlayers.map(player => {
                            const selected = selectedIds.includes(player._id)
                            return (
                                <button
                                    key={player._id}
                                    onClick={() => togglePlayer(player._id)}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${
                                        selected
                                            ? 'bg-gray-800 border-gray-600 ring-1 ring-gray-500'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                    }`}>
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: player.avatarColor }}
                                    />
                                    <span className="font-semibold text-sm flex-1">{player.name}</span>
                                    {selected && (
                                        <span className="text-gray-400 text-xs">
                                            #{selectedIds.indexOf(player._id) + 1}
                                        </span>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={proceedToSettings}
                        disabled={selectedIds.length < 2}
                        className="w-full bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-950 font-semibold py-4 rounded-2xl text-base transition-colors">
                        Continue ({selectedIds.length} selected)
                    </button>
                </div>
            </div>
        )
    }

    // Step 2 — Settings
    if (step === 'settings') {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col">
                <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-4">
                    <div className="mb-3"><HomeButton /></div>
                    <h1 className="text-xl font-bold">New Quick Match</h1>
                    <p className="text-gray-500 text-xs mt-1">Step 2 of 3 — Settings</p>
                </div>

                <div className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto">
                    {/* Starting score */}
                    <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Mode</p>
                        <div className="grid grid-cols-3 gap-2">
                            {([301, 501, 701] as const).map(score => (
                                <button
                                    key={score}
                                    onClick={() => setSettings(s => ({ ...s, startingScore: score }))}
                                    className={`py-3 rounded-xl font-bold text-sm border transition-colors ${
                                        settings.startingScore === score
                                            ? 'bg-white text-gray-950 border-white'
                                            : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                                    }`}>
                                    {score}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Double In */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-300">Double In</p>
                            <p className="text-xs text-gray-600 mt-0.5">Start scoring on a double</p>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, doubleIn: !s.doubleIn }))}
                            className={`w-12 h-6 rounded-full border transition-colors relative ${
                                settings.doubleIn
                                    ? 'bg-white border-white'
                                    : 'bg-gray-800 border-gray-700'
                            }`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                                settings.doubleIn
                                    ? 'left-6 bg-gray-950'
                                    : 'left-0.5 bg-gray-500'
                            }`} />
                        </button>
                    </div>

                    {/* Double Out */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-300">Double Out</p>
                            <p className="text-xs text-gray-600 mt-0.5">Must finish on a double</p>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, doubleOut: !s.doubleOut }))}
                            className={`w-12 h-6 rounded-full border transition-colors relative ${
                                settings.doubleOut
                                    ? 'bg-white border-white'
                                    : 'bg-gray-800 border-gray-700'
                            }`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                                settings.doubleOut
                                    ? 'left-6 bg-gray-950'
                                    : 'left-0.5 bg-gray-500'
                            }`} />
                        </button>
                    </div>

                    {/* Legs to win */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-300">Legs to win</p>
                        </div>
                        <Stepper
                            value={settings.legsToWin}
                            min={1}
                            onChange={v => setSettings(s => ({ ...s, legsToWin: v }))}
                        />
                    </div>

                    {/* Sets to win */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-300">Sets to win</p>
                            <p className="text-xs text-gray-600 mt-0.5">0 = legs only (no sets)</p>
                        </div>
                        <Stepper
                            value={settings.setsToWin}
                            min={0}
                            onChange={v => setSettings(s => ({ ...s, setsToWin: v }))}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={() => setStep('players')}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white font-semibold py-4 rounded-2xl text-base transition-colors">
                        Back
                    </button>
                    <button
                        onClick={proceedToOrder}
                        className="flex-1 bg-white hover:bg-gray-100 text-gray-950 font-semibold py-4 rounded-2xl text-base transition-colors">
                        Continue
                    </button>
                </div>
            </div>
        )
    }

    // Step 3 — Player order
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-4">
                <div className="mb-3"><HomeButton /></div>
                <h1 className="text-xl font-bold">New Quick Match</h1>
                <p className="text-gray-500 text-xs mt-1">Step 3 of 3 — Player order</p>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3">
                <button
                    onClick={randomOrder}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                    Random Order
                </button>

                <div className="flex flex-col gap-2 mt-1">
                    {orderedPlayers.map((player, index) => (
                        <div
                            key={player._id}
                            className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                            <span className="text-gray-500 text-sm font-bold w-5 text-center">{index + 1}</span>
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: player.avatarColor }}
                            />
                            <span className="flex-1 font-semibold text-sm">{player.name}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => moveUp(index)}
                                    disabled={index === 0}
                                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-20 border border-gray-700 text-white text-xs flex items-center justify-center transition-colors">
                                    ↑
                                </button>
                                <button
                                    onClick={() => moveDown(index)}
                                    disabled={index === orderedPlayers.length - 1}
                                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-20 border border-gray-700 text-white text-xs flex items-center justify-center transition-colors">
                                    ↓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mt-1">
                    <p className="text-xs text-gray-500 text-center">
                        {settings.startingScore} · {settings.legsToWin} legs
                        {settings.setsToWin > 0 ? ` · ${settings.setsToWin} sets` : ''}
                        {settings.doubleIn ? ' · DI' : ''}
                        {settings.doubleOut ? ' · DO' : ''}
                    </p>
                </div>
            </div>

            {error && <p className="text-red-400 text-center text-xs px-4 py-2">{error}</p>}

            <div className="p-4 border-t border-gray-800 flex gap-3">
                <button
                    onClick={() => setStep('settings')}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white font-semibold py-4 rounded-2xl text-base transition-colors">
                    Back
                </button>
                <button
                    onClick={startMatch}
                    disabled={submitting}
                    className="flex-1 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-950 font-semibold py-4 rounded-2xl text-base transition-colors">
                    {submitting ? 'Starting…' : 'Start Match'}
                </button>
            </div>
        </div>
    )
}
