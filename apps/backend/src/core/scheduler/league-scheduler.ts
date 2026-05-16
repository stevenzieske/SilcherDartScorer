const BYE = 'BYE'

// Flat pairing record returned by the scheduler.
// The service layer creates Match documents from these, then builds LeagueRound[] with real matchIds.
// boardCount is NOT a parameter — boards are assigned dynamically at runtime when a board becomes free.
export interface LeaguePairing {
    roundNumber: number   // 1, 2, or 3
    matchOrder: number    // position in the queue within this round (1-based)
    players: [string, string]
}

function rotateRight<T>(arr: T[], by: number): T[] {
    if (arr.length === 0) return arr
    const n = arr.length
    const b = ((by % n) + n) % n
    if (b === 0) return arr
    return [...arr.slice(n - b), ...arr.slice(0, n - b)]
}

// Circle method: fix players[0], rotate the rest. Returns 3 rounds of pairs.
// players.length must be even — caller adds BYE if odd.
function buildRoundPairings(players: string[]): [string, string][][] {
    const n = players.length
    const fixed = players[0]
    const rotating = players.slice(1)
    const rounds: [string, string][][] = []

    for (let r = 0; r < 3; r++) {
        const rotated = rotateRight(rotating, r)
        const circle = [fixed, ...rotated]
        const pairs: [string, string][] = []

        for (let i = 0; i < n / 2; i++) {
            pairs.push([circle[i], circle[n - 1 - i]])
        }

        rounds.push(pairs)
    }

    return rounds
}

export function generateLeagueSchedule(playerIds: string[]): LeaguePairing[] {
    if (playerIds.length < 2) throw new Error('Need at least 2 players')

    const players = playerIds.length % 2 === 0
        ? [...playerIds]
        : [...playerIds, BYE]

    const rounds = buildRoundPairings(players)
    const pairings: LeaguePairing[] = []

    for (let ri = 0; ri < rounds.length; ri++) {
        const realPairs = rounds[ri].filter(
            ([a, b]) => a !== BYE && b !== BYE
        )

        realPairs.forEach((pair, i) => {
            pairings.push({
                roundNumber: ri + 1,
                matchOrder: i + 1,
                players: pair,
            })
        })
    }

    return pairings
}
