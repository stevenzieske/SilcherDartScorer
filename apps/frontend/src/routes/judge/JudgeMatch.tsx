import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import http from '../../api/client'
import { useMatchStore } from '../../stores/match.store'
import { useMatchSocket } from '../../socket/useMatchSocket'
import { socket } from '../../socket/socket.client'
import { EVENTS, buildCheckoutDisplay } from '@dart/shared'
import type { Match, TurnData } from '@dart/shared'
import BackButton from '../../components/ui/BackButton'
import { usePlayers } from '../../hooks/usePlayers'

const JUDGE_ID = `judge-${Math.random().toString(36).slice(2, 8)}`
type Modifier = 'Double' | 'Triple'

const VALUES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]

function scoreFromNotation(n: string): number {
    if (n === 'MISS') return 0
    if (n === 'BULL') return 50
    if (n === '25') return 25
    if (n.startsWith('D')) return parseInt(n.slice(1)) * 2
    if (n.startsWith('T')) return parseInt(n.slice(1)) * 3
    return parseInt(n)
}

function isDouble(n: string): boolean {
    return n.startsWith('D') || n === 'BULL'
}

function isTurnTerminal(darts: string[], startRemaining: number, doubleOut: boolean): boolean {
    if (darts.length === 3) return true
    let rem = startRemaining
    for (const d of darts) {
        const next = rem - scoreFromNotation(d)
        const bust = next < 0 || (doubleOut && next === 1) || (doubleOut && next === 0 && !isDouble(d))
        const checkout = next === 0 && (!doubleOut || isDouble(d))
        if (bust || checkout) return true
        rem = next
    }
    return false
}

function calcAverage(playerId: string, turns: TurnData[]): string {
    const mine = turns.filter(t => t.playerId === playerId)
    const totalDarts = mine.reduce((s, t) => s + t.darts.length, 0)
    const totalScore = mine.reduce((s, t) => s + t.turnScore, 0)
    if (totalDarts === 0) return '—'
    return ((totalScore / totalDarts) * 3).toFixed(1)
}

function dartCount(playerId: string, turns: TurnData[]): number {
    return turns.filter(t => t.playerId === playerId).reduce((s, t) => s + t.darts.length, 0)
}

export default function JudgeMatch() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { matchState, inProgress } = useMatchStore()
    const [match, setMatch] = useState<Match | null>(null)
    const [modifier, setModifier] = useState<Modifier | null>(null)
    const [pendingDarts, setPendingDarts] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const { getName } = usePlayers()
    const playerScrollRef = useRef<HTMLDivElement>(null)
    const playerPanelRefs = useRef<(HTMLDivElement | null)[]>([])

    useMatchSocket(id!)

    useEffect(() => {
        http.get<Match>(`/matches/${id}`).then(r => setMatch(r.data))
    }, [id])

    // Only claim/release for non-quick matches
    useEffect(() => {
        if (!match) return
        if (!match.isQuickMatch) {
            socket.emit(EVENTS.JUDGE_CLAIM_MATCH, { matchId: id!, judgeId: JUDGE_ID })
            return () => { socket.emit(EVENTS.JUDGE_RELEASE_MATCH, { matchId: id! }) }
        }
    }, [id, match?.isQuickMatch])


    const leg = matchState?.currentLeg
    const currentPlayerIndex = leg?.currentPlayerIndex ?? 0
    const currentPlayerId = match?.players[currentPlayerIndex] ?? ''
    const remaining = leg?.remaining[currentPlayerIndex] ?? 0
    const doubleOut = matchState?.rules.doubleOut ?? true
    const setsToWin = matchState?.rules.setsToWin ?? 0

    const rules = {
        startingScore: matchState?.rules.startingScore ?? 501,
        legsToWin: matchState?.rules.legsToWin ?? 2,
        doubleIn: matchState?.rules.doubleIn ?? false,
        doubleOut: matchState?.rules.doubleOut ?? true,
        setsToWin,
    }

    useEffect(() => {
        const container = playerScrollRef.current
        const panel = playerPanelRefs.current[currentPlayerIndex]
        if (!container || !panel) return
        const containerLeft = container.getBoundingClientRect().left
        const panelLeft = panel.getBoundingClientRect().left
        const scrollTarget = container.scrollLeft + panelLeft - containerLeft
            - (container.clientWidth / 2) + (panel.clientWidth / 2)
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    }, [currentPlayerIndex, pendingDarts.length, inProgress?.dartIndex])

    async function submitTurn(darts: string[]) {
        setSubmitting(true)
        setError('')
        try {
            await http.post(`/matches/${id}/throw`, { judgeId: JUDGE_ID, darts, ...rules })
            setPendingDarts([])
        } catch {
            setError('Failed to submit turn')
            setPendingDarts([])
        } finally {
            setSubmitting(false)
        }
    }

    function throwDart(notation: string) {
        if (pendingDarts.length >= 3 || submitting) return
        const newDarts = [...pendingDarts, notation]
        const dartObjects = newDarts.map(n => ({ notation: n, score: scoreFromNotation(n) }))
        socket.emit(EVENTS.DART_THROWN, { matchId: id!, darts: dartObjects, playerId: currentPlayerId, remainingBefore: remaining })
        setPendingDarts(newDarts)
        setModifier(null)
        if (isTurnTerminal(newDarts, remaining, doubleOut)) {
            submitTurn(newDarts)
        }
    }

    async function undoLast() {
        setError('')
        if (pendingDarts.length > 0) {
            const newDarts = pendingDarts.slice(0, -1)
            const dartObjects = newDarts.map(n => ({ notation: n, score: scoreFromNotation(n) }))
            socket.emit(EVENTS.DART_THROWN, { matchId: id!, darts: dartObjects, playerId: currentPlayerId, remainingBefore: remaining })
            setPendingDarts(newDarts)
            return
        }
        try {
            const res = await http.post<{ undoneNotations: string[] }>(`/matches/${id}/undo`, rules)
            setPendingDarts(res.data.undoneNotations)
        } catch {
            setError('Nothing to undo')
        }
    }

    if (!match) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        )
    }

    const turns = leg?.turns ?? []
    const disabled = pendingDarts.length >= 3 || submitting

    // inProgress from another judge — use it only when this judge hasn't started entering darts
    const hasInProgress = !!inProgress && pendingDarts.length === 0
    const displayDarts = hasInProgress
        ? inProgress!.dartsThrown.map(d => d.notation)
        : pendingDarts
    const liveRemaining = hasInProgress
        ? inProgress!.runningRemaining
        : pendingDarts.reduce((rem, n) => rem - scoreFromNotation(n), remaining)

    const checkoutHint = buildCheckoutDisplay(remaining, displayDarts, liveRemaining)

    // Bull button: 25 normally, DBULL (50) when Double active
    const bullNotation = modifier === 'Double' ? 'BULL' : '25'
    const bullLabel = modifier === 'Double' ? 'DBull' : 'Bull'
    const bullSub = modifier === 'Double' ? '50' : '25'

    const winnerName = matchState?.winnerId ? getName(matchState.winnerId) : ''

    return (
        <div className="h-[100dvh] overflow-hidden bg-gray-950 text-white flex flex-col relative">
            {/* Win confirmation overlay */}
            {matchState?.status === 'match_complete' && matchState.winnerId && (
                <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 px-8 animate-fade-in">
                    <div className="text-center mb-10">
                        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-500 mb-4">Match Complete</p>
                        <p className="text-4xl font-bold mb-2">{winnerName}</p>
                        <p className="text-gray-500 text-sm">wins the match</p>
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                            onClick={() => match?.isQuickMatch ? navigate('/quick-match') : navigate('/judge')}
                            className="w-full py-4 rounded-2xl bg-white text-gray-950 font-bold text-lg">
                            Confirm &amp; Continue
                        </button>
                        <button
                            onClick={undoLast}
                            disabled={submitting}
                            className="w-full py-3 rounded-2xl bg-red-950 border border-red-900 text-red-400 font-semibold text-sm disabled:opacity-40">
                            Undo Last Throw
                        </button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 pb-5"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="mb-4">
                    <BackButton to={match.isQuickMatch ? '/quick-match' : '/judge'} label={match.isQuickMatch ? 'Quick Match' : 'Judge'} />
                </div>
                <div ref={playerScrollRef} className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-2 min-w-max justify-center w-full">
                    {match.players.map((p, i) => {
                        const active = i === currentPlayerIndex
                        const displayScore = active && (pendingDarts.length > 0 || hasInProgress)
                            ? liveRemaining
                            : (leg?.remaining[i] ?? '—')
                        const isBust = active && typeof displayScore === 'number' && displayScore < 0
                        const darts = dartCount(p, turns)
                        return (
                            <div key={p} ref={el => { playerPanelRefs.current[i] = el }} className={`min-w-[130px] rounded-2xl p-3 text-center transition-all ${
                                active ? 'bg-gray-800 ring-1 ring-gray-600' : 'opacity-30'
                            }`}>
                                <p className="text-xs text-gray-400 mb-1 truncate">{getName(p)}</p>
                                <p key={displayScore} className={`text-5xl font-bold tabular-nums animate-pop ${isBust ? 'text-red-400' : ''}`}>
                                    {displayScore}
                                </p>
                                <div className="flex justify-center gap-3 mt-1">
                                    <p className="text-xs text-gray-500">{matchState?.legsWon[i] ?? 0}/{matchState?.rules.legsToWin ?? match?.ruleLegsToWin ?? '?'} legs</p>
                                    {setsToWin > 0 && (
                                        <p className="text-xs text-gray-500">{matchState?.setsWon[i] ?? 0} sets</p>
                                    )}
                                    <p className="text-xs text-gray-500">{darts} darts</p>
                                    <p className="text-xs text-gray-500">avg {calcAverage(p, turns)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">
                    Leg {leg?.legNumber ?? 1} · {getName(currentPlayerId)}'s turn
                </p>
            </div>

            {/* Checkout hint */}
            <div className={`px-4 py-2 border-b border-gray-800 flex items-center justify-center gap-2 min-h-[36px] transition-all ${
                checkoutHint ? 'bg-green-950' : 'bg-gray-950'
            }`}>
                {checkoutHint ? (
                    <>
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-500">Checkout</span>
                        <div className="flex gap-1.5">
                            {checkoutHint.map((d, i) => (
                                <span key={i} className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                                    d.done
                                        ? 'text-green-700 bg-green-950 line-through'
                                        : 'text-green-300 bg-green-900'
                                }`}>{d.notation}</span>
                            ))}
                        </div>
                    </>
                ) : (
                    <span className="text-xs text-gray-700">—</span>
                )}
            </div>

            {/* Pending darts */}
            <div className="flex justify-center gap-3 px-4 py-3 bg-gray-950 border-b border-gray-800">
                {[0, 1, 2].map(i => (
                    <div key={`${i}:${displayDarts[i] ?? ''}`} className={`flex-1 max-w-[80px] h-14 rounded-xl flex items-center justify-center text-sm font-bold border transition-colors ${
                        displayDarts[i] ? 'bg-gray-800 border-gray-600 text-white animate-pop' : 'bg-gray-900 border-gray-800 text-gray-600'
                    }`}>
                        {displayDarts[i] ?? '—'}
                    </div>
                ))}
            </div>

            {error && <p className="text-red-400 text-center text-xs px-4 py-2">{error}</p>}

            {/* Modifier toggles */}
            <div className="flex gap-2 px-4 py-3">
                {(['Double', 'Triple'] as const).map(m => (
                    <button key={m}
                        onClick={() => setModifier(prev => prev === m ? null : m)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                            modifier === m
                                ? 'bg-white text-gray-950 border-white'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}>
                        {m}
                    </button>
                ))}
            </div>

            {/* Number grid + action row */}
            <div className="flex-1 min-h-0"
                style={{ padding: '4px 6px', paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}>
                <div className="grid grid-cols-5 gap-1 h-full"
                    style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
                    {VALUES.map(v => {
                        const label = modifier === 'Double' ? `D${v}` : modifier === 'Triple' ? `T${v}` : `${v}`
                        return (
                            <button key={v}
                                onClick={() => throwDart(label)}
                                disabled={disabled}
                                className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 border border-gray-800 hover:border-gray-700 rounded-xl font-bold text-lg transition-colors">
                                {label}
                            </button>
                        )
                    })}
                    {/* Last row: Bull | Undo | Miss */}
                    <button onClick={() => throwDart(bullNotation)} disabled={disabled}
                        className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 border border-gray-800 hover:border-gray-700 rounded-xl font-bold col-span-2 flex flex-col items-center justify-center leading-tight transition-colors">
                        <span>{bullLabel}</span>
                        <span className="text-xs font-normal text-gray-500">{bullSub}</span>
                    </button>
                    <button onClick={undoLast}
                        className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 rounded-xl font-semibold text-sm col-span-1 transition-colors">
                        Undo
                    </button>
                    <button onClick={() => throwDart('MISS')} disabled={disabled}
                        className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 border border-gray-700 hover:border-gray-600 text-gray-400 rounded-xl font-bold col-span-2 transition-colors">
                        Miss
                    </button>
                </div>
            </div>
        </div>
    )
}
