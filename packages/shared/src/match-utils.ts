// Utilities shared between frontend judge UI and the backend match engine.
// Keep these in sync with match-engine.ts — they deliberately replicate
// the same scoring logic so the frontend can simulate turns locally.

export function scoreFromNotation(n: string): number {
    if (n === 'MISS') return 0
    if (n === 'BULL') return 50
    if (n === '25') return 25
    if (n.startsWith('D')) return parseInt(n.slice(1), 10) * 2
    if (n.startsWith('T')) return parseInt(n.slice(1), 10) * 3
    return parseInt(n, 10)
}

export function isDoubleNotation(n: string): boolean {
    return n.startsWith('D') || n === 'BULL'
}

/**
 * Returns true when the current turn should be auto-submitted.
 *
 * A turn ends when:
 * - 3 darts have been thrown, OR
 * - a dart causes a checkout (remaining reaches exactly 0 on a valid double), OR
 * - a dart causes a bust (remaining goes negative or lands on 1 / non-double 0 with doubleOut).
 *
 * When doubleIn is active AND startRemaining equals startingScore (player hasn't opened yet),
 * darts before the first double don't affect the score, so only the darts from the
 * first double onward are simulated. If no double is hit, the turn can only end at 3 darts.
 */
export function isTurnTerminal(
    darts: string[],
    startRemaining: number,
    doubleOut: boolean,
    doubleIn: boolean,
    startingScore: number,
): boolean {
    if (darts.length === 3) return true

    // With doubleIn active on the opening turn, skip pre-double darts
    if (doubleIn && startRemaining === startingScore) {
        const firstDoubleIdx = darts.findIndex(n => isDoubleNotation(n))
        if (firstDoubleIdx === -1) return false // no double yet — only 3-dart limit applies
        const effectiveDarts = darts.slice(firstDoubleIdx)
        let rem = startRemaining
        for (const d of effectiveDarts) {
            const next = rem - scoreFromNotation(d)
            const bust = next < 0 || (doubleOut && next === 1) || (doubleOut && next === 0 && !isDoubleNotation(d))
            const checkout = next === 0 && (!doubleOut || isDoubleNotation(d))
            if (bust || checkout) return true
            rem = next
        }
        return false
    }

    let rem = startRemaining
    for (const d of darts) {
        const next = rem - scoreFromNotation(d)
        const bust = next < 0 || (doubleOut && next === 1) || (doubleOut && next === 0 && !isDoubleNotation(d))
        const checkout = next === 0 && (!doubleOut || isDoubleNotation(d))
        if (bust || checkout) return true
        rem = next
    }
    return false
}
