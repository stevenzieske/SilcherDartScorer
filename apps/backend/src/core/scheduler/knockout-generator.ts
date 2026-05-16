import type { BracketRound, BracketSlot } from '@dart/shared'

// Standard seeding order for bracket halves.
// Index 0 = top-half match 1, index 1 = top-half match 2, etc.
// For 4p: [[0,3],[1,2]]  → 1v4, 2v3
// For 8p: [[0,7],[3,4],[1,6],[2,5]] → 1v8, 4v5, 2v7, 3v6
const SEED_PAIRS: Record<4 | 8, [number, number][]> = {
    4: [[0, 3], [1, 2]],
    8: [[0, 7], [3, 4], [1, 6], [2, 5]],
}

function makeSlot(
    slotIndex: number,
    player1: string | 'BYE' | 'TBD',
    player2: string | 'BYE' | 'TBD',
    playsFor: number | null = null,
    isBye = false,
): BracketSlot {
    return {
        slotIndex,
        matchId: null,
        player1,
        player2,
        winnerId: null,
        loserId: null,
        isBye,
        playsFor,
    }
}

function makeRound(
    roundNumber: number,
    roundName: string,
    bracketSide: 'winners' | 'consolation',
    slots: BracketSlot[],
): BracketRound {
    return { roundNumber, roundName, bracketSide, slots }
}

function buildFor4(playerIds: string[]): BracketRound[] {
    const qf = SEED_PAIRS[4].map(([a, b], i) =>
        makeSlot(i + 1, playerIds[a], playerIds[b])
    )

    return [
        makeRound(1, 'Semi-Finals', 'winners', qf),
        makeRound(2, 'Final', 'winners', [makeSlot(1, 'TBD', 'TBD', 1)]),
        makeRound(2, '3rd Place', 'consolation', [makeSlot(1, 'TBD', 'TBD', 3)]),
    ]
}

function buildFor8(playerIds: string[]): BracketRound[] {
    const qf = SEED_PAIRS[8].map(([a, b], i) =>
        makeSlot(i + 1, playerIds[a], playerIds[b])
    )

    const sfSlots = [makeSlot(1, 'TBD', 'TBD'), makeSlot(2, 'TBD', 'TBD')]
    const cons58Slots = [makeSlot(1, 'TBD', 'TBD'), makeSlot(2, 'TBD', 'TBD')]

    return [
        makeRound(1, 'Quarter-Finals', 'winners', qf),
        makeRound(2, 'Semi-Finals', 'winners', sfSlots),
        makeRound(2, '5th–8th Place', 'consolation', cons58Slots),
        makeRound(3, 'Final', 'winners', [makeSlot(1, 'TBD', 'TBD', 1)]),
        makeRound(3, '3rd Place', 'consolation', [makeSlot(1, 'TBD', 'TBD', 3)]),
        makeRound(3, '5th Place', 'consolation', [makeSlot(1, 'TBD', 'TBD', 5)]),
        makeRound(3, '7th Place', 'consolation', [makeSlot(1, 'TBD', 'TBD', 7)]),
    ]
}

export function generateKnockoutBracket(
    playerIds: string[],
    knockoutSize: 4 | 8,
): BracketRound[] {
    if (playerIds.length !== knockoutSize) {
        throw new Error(
            `Expected ${knockoutSize} players, got ${playerIds.length}`,
        )
    }

    return knockoutSize === 4
        ? buildFor4(playerIds)
        : buildFor8(playerIds)
}
