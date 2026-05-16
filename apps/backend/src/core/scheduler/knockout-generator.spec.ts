import { generateKnockoutBracket } from './knockout-generator'
import type { BracketRound, BracketSlot } from '@dart/shared'

// --- Helpers ---

function winnersRounds(rounds: BracketRound[]): BracketRound[] {
    return rounds.filter(r => r.bracketSide === 'winners')
}

function consolationRounds(rounds: BracketRound[]): BracketRound[] {
    return rounds.filter(r => r.bracketSide === 'consolation')
}

function allSlots(rounds: BracketRound[]): BracketSlot[] {
    return rounds.flatMap(r => r.slots)
}

function playersInRound(rounds: BracketRound[], roundNumber: number): string[] {
    return rounds
        .filter(r => r.roundNumber === roundNumber)
        .flatMap(r => r.slots)
        .flatMap(s => [s.player1, s.player2])
}

// --- Tests ---

describe('generateKnockoutBracket', () => {

    describe('validation', () => {
        it('throws if player count does not match knockoutSize', () => {
            expect(() => generateKnockoutBracket(['p1', 'p2', 'p3'], 4)).toThrow()
            expect(() => generateKnockoutBracket(['p1', 'p2', 'p3', 'p4', 'p5'], 8)).toThrow()
        })
    })

    describe('4-player bracket', () => {
        const players = ['p1', 'p2', 'p3', 'p4']
        const rounds = generateKnockoutBracket(players, 4)

        it('produces 3 rounds', () => {
            expect(rounds).toHaveLength(3)
        })

        it('has 2 winners rounds and 1 consolation round', () => {
            expect(winnersRounds(rounds)).toHaveLength(2)
            expect(consolationRounds(rounds)).toHaveLength(1)
        })

        it('round 1 is Semi-Finals with 2 slots', () => {
            const r1 = rounds.find(r => r.roundNumber === 1)!
            expect(r1.roundName).toBe('Semi-Finals')
            expect(r1.slots).toHaveLength(2)
        })

        it('round 1 uses correct seeding — 1v4 and 2v3', () => {
            const slots = rounds.find(r => r.roundNumber === 1)!.slots
            expect(slots[0].player1).toBe('p1')
            expect(slots[0].player2).toBe('p4')
            expect(slots[1].player1).toBe('p2')
            expect(slots[1].player2).toBe('p3')
        })

        it('all round-1 slots have real players (no TBD)', () => {
            const r1Players = playersInRound(rounds, 1)
            expect(r1Players.every(p => p !== 'TBD' && p !== 'BYE')).toBe(true)
        })

        it('all round-2 slots start as TBD', () => {
            const r2Players = playersInRound(rounds, 2)
            expect(r2Players.every(p => p === 'TBD')).toBe(true)
        })

        it('Final slot has playsFor = 1', () => {
            const final = rounds.find(r => r.roundName === 'Final')!
            expect(final.slots[0].playsFor).toBe(1)
        })

        it('3rd Place slot has playsFor = 3', () => {
            const third = rounds.find(r => r.roundName === '3rd Place')!
            expect(third.slots[0].playsFor).toBe(3)
        })

        it('all slots start with matchId null, winnerId null, loserId null', () => {
            for (const slot of allSlots(rounds)) {
                expect(slot.matchId).toBeNull()
                expect(slot.winnerId).toBeNull()
                expect(slot.loserId).toBeNull()
            }
        })

        it('slotIndex is 1-based within each round', () => {
            for (const round of rounds) {
                round.slots.forEach((slot, i) => {
                    expect(slot.slotIndex).toBe(i + 1)
                })
            }
        })

        it('no slot is marked isBye', () => {
            expect(allSlots(rounds).every(s => !s.isBye)).toBe(true)
        })

        it('round numbers are 1 and 2', () => {
            const roundNumbers = new Set(rounds.map(r => r.roundNumber))
            expect(roundNumbers).toEqual(new Set([1, 2]))
        })
    })

    describe('8-player bracket', () => {
        const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
        const rounds = generateKnockoutBracket(players, 8)

        it('produces 7 rounds', () => {
            expect(rounds).toHaveLength(7)
        })

        it('has 3 winners rounds and 4 consolation rounds', () => {
            expect(winnersRounds(rounds)).toHaveLength(3)
            expect(consolationRounds(rounds)).toHaveLength(4)
        })

        it('round 1 is Quarter-Finals with 4 slots', () => {
            const r1 = rounds.find(r => r.roundNumber === 1)!
            expect(r1.roundName).toBe('Quarter-Finals')
            expect(r1.slots).toHaveLength(4)
        })

        it('round 1 uses correct seeding — 1v8, 4v5, 2v7, 3v6', () => {
            const slots = rounds.find(r => r.roundNumber === 1)!.slots
            expect([slots[0].player1, slots[0].player2]).toEqual(['p1', 'p8'])
            expect([slots[1].player1, slots[1].player2]).toEqual(['p4', 'p5'])
            expect([slots[2].player1, slots[2].player2]).toEqual(['p2', 'p7'])
            expect([slots[3].player1, slots[3].player2]).toEqual(['p3', 'p6'])
        })

        it('all round-1 slots have real players (no TBD)', () => {
            const r1Players = playersInRound(rounds, 1)
            expect(r1Players.every(p => p !== 'TBD' && p !== 'BYE')).toBe(true)
        })

        it('all round-1 players are from the original list', () => {
            const r1Players = playersInRound(rounds, 1)
            expect(r1Players.every(p => players.includes(p))).toBe(true)
        })

        it('each player appears exactly once in round 1', () => {
            const r1Players = playersInRound(rounds, 1)
            expect(r1Players).toHaveLength(8)
            expect(new Set(r1Players).size).toBe(8)
        })

        it('all round-2 and round-3 slots start as TBD', () => {
            const laterPlayers = [...playersInRound(rounds, 2), ...playersInRound(rounds, 3)]
            expect(laterPlayers.every(p => p === 'TBD')).toBe(true)
        })

        it('Final slot (round 3 winners) has playsFor = 1', () => {
            const final = rounds.find(r => r.roundName === 'Final')!
            expect(final.bracketSide).toBe('winners')
            expect(final.roundNumber).toBe(3)
            expect(final.slots[0].playsFor).toBe(1)
        })

        it('3rd Place slot has playsFor = 3', () => {
            const third = rounds.find(r => r.roundName === '3rd Place')!
            expect(third.slots[0].playsFor).toBe(3)
        })

        it('5th Place slot has playsFor = 5', () => {
            const fifth = rounds.find(r => r.roundName === '5th Place')!
            expect(fifth.slots[0].playsFor).toBe(5)
        })

        it('7th Place slot has playsFor = 7', () => {
            const seventh = rounds.find(r => r.roundName === '7th Place')!
            expect(seventh.slots[0].playsFor).toBe(7)
        })

        it('round 2 Semi-Finals has 2 slots', () => {
            const sf = rounds.find(r => r.roundName === 'Semi-Finals')!
            expect(sf.slots).toHaveLength(2)
        })

        it('round 2 consolation has 2 slots', () => {
            const cons = rounds.find(r => r.roundName === '5th–8th Place')!
            expect(cons.slots).toHaveLength(2)
        })

        it('all slots start with matchId null, winnerId null, loserId null', () => {
            for (const slot of allSlots(rounds)) {
                expect(slot.matchId).toBeNull()
                expect(slot.winnerId).toBeNull()
                expect(slot.loserId).toBeNull()
            }
        })

        it('slotIndex is 1-based within each round-side combination', () => {
            for (const round of rounds) {
                round.slots.forEach((slot, i) => {
                    expect(slot.slotIndex).toBe(i + 1)
                })
            }
        })

        it('no slot is marked isBye', () => {
            expect(allSlots(rounds).every(s => !s.isBye)).toBe(true)
        })

        it('round numbers are 1, 2, and 3', () => {
            const roundNumbers = new Set(rounds.map(r => r.roundNumber))
            expect(roundNumbers).toEqual(new Set([1, 2, 3]))
        })

        it('placement slots cover 1, 3, 5, 7 — all four placements', () => {
            const playsFor = allSlots(rounds)
                .map(s => s.playsFor)
                .filter((p): p is number => p !== null)
                .sort((a, b) => a - b)
            expect(playsFor).toEqual([1, 3, 5, 7])
        })
    })
})
