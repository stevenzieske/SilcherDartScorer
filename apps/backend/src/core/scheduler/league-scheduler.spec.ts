import { generateLeagueSchedule, LeaguePairing } from './league-scheduler'

// --- Helpers ---

function playersInRound(pairings: LeaguePairing[], round: number): string[] {
    return pairings.filter(p => p.roundNumber === round).flatMap(p => p.players)
}

function normalizePair(players: [string, string]): string {
    return [...players].sort().join('|')
}

function matchOrdersInRound(pairings: LeaguePairing[], round: number): number[] {
    return pairings
        .filter(p => p.roundNumber === round)
        .map(p => p.matchOrder)
        .sort((a, b) => a - b)
}

// --- Tests ---

describe('generateLeagueSchedule', () => {

    describe('validation', () => {
        it('throws for fewer than 2 players', () => {
            expect(() => generateLeagueSchedule(['p0'], 3)).toThrow()
        })
    })

    describe('4 players (even), matchesPerPlayer=3', () => {
        const players = ['p0', 'p1', 'p2', 'p3']
        const result = generateLeagueSchedule(players, 3)

        it('produces 6 pairings (2 per round × 3 rounds)', () => {
            expect(result).toHaveLength(6)
        })

        it('every player appears exactly once per round', () => {
            for (let r = 1; r <= 3; r++) {
                const inRound = playersInRound(result, r)
                expect(inRound).toHaveLength(4)
                expect(new Set(inRound).size).toBe(4)
            }
        })

        it('no pair plays each other twice across the 3 rounds', () => {
            const pairs = result.map(p => normalizePair(p.players))
            expect(new Set(pairs).size).toBe(pairs.length)
        })

        it('matchOrder within each round starts at 1 and is sequential', () => {
            for (let r = 1; r <= 3; r++) {
                expect(matchOrdersInRound(result, r)).toEqual([1, 2])
            }
        })

        it('all player IDs are from the original list', () => {
            const allIds = result.flatMap(p => p.players)
            expect(allIds.every(id => players.includes(id))).toBe(true)
        })
    })

    describe('4 players, matchesPerPlayer=2 (fewer rounds than max)', () => {
        const result = generateLeagueSchedule(['p0', 'p1', 'p2', 'p3'], 2)

        it('produces 4 pairings (2 per round × 2 rounds)', () => {
            expect(result).toHaveLength(4)
        })

        it('only rounds 1 and 2 exist', () => {
            const rounds = new Set(result.map(p => p.roundNumber))
            expect(rounds).toEqual(new Set([1, 2]))
        })
    })

    describe('6 players (even), matchesPerPlayer=3', () => {
        const players = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']
        const result = generateLeagueSchedule(players, 3)

        it('produces 9 pairings (3 per round × 3 rounds)', () => {
            expect(result).toHaveLength(9)
        })

        it('every player appears exactly once per round', () => {
            for (let r = 1; r <= 3; r++) {
                const inRound = playersInRound(result, r)
                expect(inRound).toHaveLength(6)
                expect(new Set(inRound).size).toBe(6)
            }
        })

        it('no pair plays each other twice', () => {
            const pairs = result.map(p => normalizePair(p.players))
            expect(new Set(pairs).size).toBe(pairs.length)
        })

        it('matchOrder within each round is 1, 2, 3', () => {
            for (let r = 1; r <= 3; r++) {
                expect(matchOrdersInRound(result, r)).toEqual([1, 2, 3])
            }
        })
    })

    describe('5 players (odd — adds BYE internally), matchesPerPlayer=3', () => {
        const players = ['p0', 'p1', 'p2', 'p3', 'p4']
        const result = generateLeagueSchedule(players, 3)

        it('produces 6 pairings (2 real matches per round × 3 rounds)', () => {
            expect(result).toHaveLength(6)
        })

        it('BYE never appears as a player', () => {
            expect(result.flatMap(p => p.players)).not.toContain('BYE')
        })

        it('no player appears twice in the same round', () => {
            for (let r = 1; r <= 3; r++) {
                const inRound = playersInRound(result, r)
                expect(new Set(inRound).size).toBe(inRound.length)
            }
        })

        it('no player sits out more than once across 3 rounds', () => {
            const byeCount: Record<string, number> = {}
            for (const player of players) byeCount[player] = 0

            for (let r = 1; r <= 3; r++) {
                const inRound = new Set(playersInRound(result, r))
                for (const player of players) {
                    if (!inRound.has(player)) byeCount[player]++
                }
            }

            for (const player of players) {
                expect(byeCount[player]).toBeLessThanOrEqual(1)
            }
        })

        it('no pair plays each other twice', () => {
            const pairs = result.map(p => normalizePair(p.players))
            expect(new Set(pairs).size).toBe(pairs.length)
        })
    })

    describe('7 players (odd, larger), matchesPerPlayer=3', () => {
        const players = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']
        const result = generateLeagueSchedule(players, 3)

        it('produces 9 pairings (3 real matches per round × 3 rounds)', () => {
            expect(result).toHaveLength(9)
        })

        it('BYE never appears as a player', () => {
            expect(result.flatMap(p => p.players)).not.toContain('BYE')
        })

        it('no player sits out more than once', () => {
            const byeCount: Record<string, number> = {}
            for (const player of players) byeCount[player] = 0

            for (let r = 1; r <= 3; r++) {
                const inRound = new Set(playersInRound(result, r))
                for (const player of players) {
                    if (!inRound.has(player)) byeCount[player]++
                }
            }

            for (const player of players) {
                expect(byeCount[player]).toBeLessThanOrEqual(1)
            }
        })
    })

    describe('12 players, matchesPerPlayer=3', () => {
        const players = Array.from({ length: 12 }, (_, i) => `p${i}`)
        const result = generateLeagueSchedule(players, 3)

        it('produces 18 matches (6 per round × 3 rounds)', () => {
            expect(result).toHaveLength(18)
        })

        it('every player appears exactly once per round', () => {
            for (let r = 1; r <= 3; r++) {
                const inRound = playersInRound(result, r)
                expect(inRound).toHaveLength(12)
                expect(new Set(inRound).size).toBe(12)
            }
        })
    })

    describe('2 players (minimum — only 1 unique round possible)', () => {
        const result = generateLeagueSchedule(['p0', 'p1'], 3)

        it('produces 1 pairing (capped by available rounds)', () => {
            expect(result).toHaveLength(1)
        })

        it('the pair plays in round 1', () => {
            expect(result[0].roundNumber).toBe(1)
        })
    })

    describe('roundNumber', () => {
        it('all 3 round numbers are present for 4 players with matchesPerPlayer=3', () => {
            const result = generateLeagueSchedule(['p0', 'p1', 'p2', 'p3'], 3)
            const rounds = new Set(result.map(p => p.roundNumber))
            expect(rounds).toEqual(new Set([1, 2, 3]))
        })
    })
})
