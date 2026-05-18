import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { socket } from '../../socket/socket.client'
import type { Match } from '@dart/shared'
import { MatchStatus, EVENTS } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'
import { usePlayers } from '../../hooks/usePlayers'

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }: {
    title: string
    message: string
    confirmLabel: string
    confirmClass: string
    onConfirm: () => void
    onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                <h2 className="text-lg font-bold mb-2">{title}</h2>
                <p className="text-gray-400 text-sm mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 font-semibold text-sm py-2.5 rounded-xl transition-colors ${confirmClass}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function MatchSelect() {
    const navigate = useNavigate()
    const [pending, setPending] = useState<Match[]>([])
    const [active, setActive] = useState<Match[]>([])
    const [claims, setClaims] = useState<Record<string, string>>({})
    const [busy, setBusy] = useState<string | null>(null)
    const [confirmStart, setConfirmStart] = useState<Match | null>(null)
    const [confirmReset, setConfirmReset] = useState<Match | null>(null)
    const { getName } = usePlayers()

    async function fetchMatches() {
        const [pendingRes, activeRes] = await Promise.all([
            http.get<Match[]>('/matches?status=pending&isQuickMatch=false'),
            http.get<Match[]>('/matches?status=active&isQuickMatch=false'),
        ])
        setPending(pendingRes.data)
        setActive(activeRes.data)
    }

    useEffect(() => {
        fetchMatches()
        if (!socket.connected) socket.connect()
        socket.emit(EVENTS.SUBSCRIBE_JUDGES)

        const refresh = () => fetchMatches()
        socket.on(EVENTS.JUDGE_CLAIMS_UPDATED, setClaims)
        socket.on(EVENTS.MATCH_STARTED, refresh)
        socket.on(EVENTS.MATCH_RESET, refresh)
        socket.on(EVENTS.MATCH_ENDED, refresh)

        return () => {
            socket.off(EVENTS.JUDGE_CLAIMS_UPDATED, setClaims)
            socket.off(EVENTS.MATCH_STARTED, refresh)
            socket.off(EVENTS.MATCH_RESET, refresh)
            socket.off(EVENTS.MATCH_ENDED, refresh)
        }
    }, [])

    async function startMatch(match: Match, startingPlayerIndex: 0 | 1) {
        setBusy(match._id)
        setConfirmStart(null)
        try {
            await http.post(`/matches/${match._id}/start`, { startingPlayerIndex })
            navigate(`/judge/matches/${match._id}`)
        } catch {
            setBusy(null)
            fetchMatches()
        }
    }

    async function resetMatch(match: Match) {
        setBusy(match._id)
        setConfirmReset(null)
        try {
            await http.post(`/matches/${match._id}/reset`)
            await fetchMatches()
        } finally {
            setBusy(null)
        }
    }

    const matchLabel = (m: Match) => m.players.map(id => getName(id)).join(' vs ')

    const hasPending = pending.length > 0
    const hasActive = active.length > 0

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-lg mx-auto px-4 pb-6"
                style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
                <div className="mb-6"><BackButton to="/" label="Home" /></div>
                <h1 className="text-2xl font-bold mb-6">Select Match</h1>

                {!hasPending && !hasActive && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                        <p className="text-gray-500">No matches available right now</p>
                    </div>
                )}

                {/* Upcoming — judge can start */}
                {hasPending && (
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Upcoming</p>
                        <div className="flex flex-col gap-2">
                            {pending.map(m => (
                                <div key={m._id}
                                    className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold">{matchLabel(m)}</p>
                                        {m.board && <p className="text-sm text-gray-500 mt-0.5">Board {m.board}</p>}
                                    </div>
                                    <button
                                        onClick={() => setConfirmStart(m)}
                                        disabled={busy === m._id}
                                        className="shrink-0 bg-white hover:bg-gray-200 disabled:opacity-50 text-gray-950 font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
                                        {busy === m._id ? 'Starting…' : 'Start'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active — judge can claim or reset */}
                {hasActive && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                            Live <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full ml-1 align-middle" />
                        </p>
                        <div className="flex flex-col gap-2">
                            {active.map(m => {
                                const claimed = !!claims[m._id]
                                return (
                                    <div key={m._id}
                                        className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                                        <div
                                            onClick={() => !claimed && navigate(`/judge/matches/${m._id}`)}
                                            className={`flex-1 min-w-0 ${claimed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <p className="font-semibold">{matchLabel(m)}</p>
                                            {m.board && <p className="text-sm text-gray-500 mt-0.5">Board {m.board}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {claimed && <span className="text-xs text-gray-400">In use</span>}
                                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-900 text-green-400">
                                                {m.status}
                                            </span>
                                            <button
                                                onClick={() => setConfirmReset(m)}
                                                disabled={busy === m._id}
                                                className="text-xs px-2.5 py-1 rounded-xl font-medium bg-gray-800 hover:bg-red-950 hover:text-red-400 text-gray-400 transition-colors disabled:opacity-50">
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {confirmStart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
                        <h2 className="text-lg font-bold mb-1">Who throws first?</h2>
                        <p className="text-gray-500 text-sm mb-5">{matchLabel(confirmStart)}</p>
                        <div className="flex flex-col gap-3">
                            {confirmStart.players.map((pid, i) => (
                                <button
                                    key={pid}
                                    onClick={() => startMatch(confirmStart, i as 0 | 1)}
                                    className="bg-gray-800 hover:bg-white hover:text-gray-950 border border-gray-700 hover:border-white rounded-xl py-4 font-semibold transition-colors">
                                    {getName(pid)}
                                </button>
                            ))}
                            <button
                                onClick={() => setConfirmStart(null)}
                                className="text-gray-600 hover:text-white text-sm py-2 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmReset && (
                <ConfirmModal
                    title="Reset match?"
                    message={`Reset ${matchLabel(confirmReset)}? All scores will be deleted and the match will return to upcoming.`}
                    confirmLabel="Reset"
                    confirmClass="bg-red-600 hover:bg-red-500 text-white"
                    onConfirm={() => resetMatch(confirmReset)}
                    onCancel={() => setConfirmReset(null)}
                />
            )}
        </div>
    )
}
