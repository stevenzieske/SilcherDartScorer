import type { DartThrow, LegState, Match, MatchEvent, TurnData } from '@dart/shared'
import { MatchEventType, MatchRules, MatchStatus } from '@dart/shared'
import { initialLegState, isDoubleOrBull, computeTurn, applyTurnToLeg, rebuildMatchState } from './match-engine'

// --- Fixtures & helpers ---

const STD: MatchRules = { startingScore: 501, doubleIn: false, doubleOut: true, legsToWin: 3 }
const DIN: MatchRules = { startingScore: 501, doubleIn: true, doubleOut: true, legsToWin: 3 }

const MATCH: Match = {
    _id: 'match-1',
    tournamentId: 'tour-1',
    leagueRound: null,
    roundNumber: null,
    slotIndex: null,
    board: 1,
    status: MatchStatus.Active,
    players: ['p1', 'p2'],
    currentLegNumber: 1,
    legsWon: [0, 0],
    setsWon: [0, 0],
    winnerId: null,
    judgeId: 'judge-1',
    startedAt: '2024-01-01T00:00:00Z',
    endedAt: null,
    startingPlayerIndex: 0,
    isQuickMatch: false,
    ruleStartingScore: null,
    ruleDoubleIn: null,
    ruleDoubleOut: null,
    ruleLegsToWin: null,
    ruleSetsToWin: null,
}

function d(notation: string, score: number): DartThrow {
    return { notation, score }
}

function makeLeg(remaining: number[], playerIndex: number, legNumber = 1): LegState {
    return { legNumber, remaining, currentPlayerIndex: playerIndex, startingPlayerIndex: playerIndex, turns: [] }
}

function makeTurn(
    overrides: Partial<TurnData> & { remainingBefore: number; remainingAfter: number }
): TurnData {
    return {
        playerId: 'p1',
        legNumber: 1,
        darts: [],
        turnScore: overrides.remainingBefore - overrides.remainingAfter,
        isBust: false,
        isCheckout: overrides.remainingAfter === 0,
        ...overrides,
    }
}

function makeEvent(
    type: MatchEventType,
    sequence: number,
    data: TurnData | { winnerId: string } | null = null,
): MatchEvent {
    return { _id: `evt-${sequence}`, matchId: 'match-1', legNumber: 1, sequence, type, actorId: 'judge-1', data, timestamp: '2024-01-01T00:00:00Z' }
}

// --- Tests ---

describe('initialLegState', () => {
    it('sets both players to startingScore', () => {
        expect(initialLegState(1, 0, 501).remaining).toEqual([501, 501])
    })

    it('sets currentPlayerIndex to startingPlayerIndex', () => {
        expect(initialLegState(1, 1, 501).currentPlayerIndex).toBe(1)
    })

    it('starts with no turns', () => {
        expect(initialLegState(1, 0, 501).turns).toHaveLength(0)
    })

    it('stores legNumber correctly', () => {
        expect(initialLegState(3, 1, 301).legNumber).toBe(3)
    })
})

describe('isDoubleOrBull', () => {
    it('returns true for BULL',  () => expect(isDoubleOrBull('BULL')).toBe(true))
    it('returns true for D20',   () => expect(isDoubleOrBull('D20')).toBe(true))
    it('returns true for D1',    () => expect(isDoubleOrBull('D1')).toBe(true))
    it('returns false for T20',  () => expect(isDoubleOrBull('T20')).toBe(false))
    it('returns false for 20',   () => expect(isDoubleOrBull('20')).toBe(false))
    it('returns false for 25',   () => expect(isDoubleOrBull('25')).toBe(false))
    it('returns false for MISS', () => expect(isDoubleOrBull('MISS')).toBe(false))
})

describe('computeTurn', () => {

    describe('normal scoring', () => {
        it('sums dart scores and reduces remaining', () => {
            const turn = computeTurn('p1', makeLeg([501, 501], 0), [d('T20', 60), d('T20', 60), d('T20', 60)], STD)
            expect(turn.turnScore).toBe(180)
            expect(turn.remainingAfter).toBe(321)
            expect(turn.isBust).toBe(false)
            expect(turn.isCheckout).toBe(false)
        })

        it('reads remainingBefore from the current player', () => {
            const turn = computeTurn('p1', makeLeg([321, 501], 0), [d('T20', 60)], STD)
            expect(turn.remainingBefore).toBe(321)
        })

        it('attaches playerId and legNumber', () => {
            const turn = computeTurn('p1', makeLeg([501, 501], 0), [d('1', 1)], STD)
            expect(turn.playerId).toBe('p1')
            expect(turn.legNumber).toBe(1)
        })
    })

    describe('bust — doubleOut', () => {
        it('busts when score goes below 0', () => {
            const turn = computeTurn('p1', makeLeg([20, 501], 0), [d('T20', 60)], STD)
            expect(turn.isBust).toBe(true)
            expect(turn.remainingAfter).toBe(20)
            expect(turn.turnScore).toBe(0)
        })

        it('busts when remaining would reach 1', () => {
            const turn = computeTurn('p1', makeLeg([3, 501], 0), [d('2', 2)], STD)
            expect(turn.isBust).toBe(true)
            expect(turn.remainingAfter).toBe(3)
        })

        it('busts when remaining is 0 but last dart is not a double', () => {
            const turn = computeTurn('p1', makeLeg([20, 501], 0), [d('20', 20)], STD)
            expect(turn.isBust).toBe(true)
            expect(turn.remainingAfter).toBe(20)
        })

        it('does not bust when last dart is a double and remaining reaches 0', () => {
            const turn = computeTurn('p1', makeLeg([40, 501], 0), [d('D20', 40)], STD)
            expect(turn.isBust).toBe(false)
            expect(turn.isCheckout).toBe(true)
            expect(turn.remainingAfter).toBe(0)
        })

        it('does not bust on 0 without double when doubleOut is false', () => {
            const rules: MatchRules = { ...STD, doubleOut: false }
            const turn = computeTurn('p1', makeLeg([20, 501], 0), [d('20', 20)], rules)
            expect(turn.isBust).toBe(false)
            expect(turn.isCheckout).toBe(true)
        })

        it('does not bust on remaining 1 when doubleOut is false', () => {
            const rules: MatchRules = { ...STD, doubleOut: false }
            const turn = computeTurn('p1', makeLeg([3, 501], 0), [d('2', 2)], rules)
            expect(turn.isBust).toBe(false)
            expect(turn.remainingAfter).toBe(1)
        })
    })

    describe('checkout', () => {
        it('sets isCheckout on BULL finish', () => {
            const turn = computeTurn('p1', makeLeg([50, 501], 0), [d('BULL', 50)], STD)
            expect(turn.isCheckout).toBe(true)
            expect(turn.isBust).toBe(false)
        })

        it('classic 170 checkout: T20 T20 BULL', () => {
            const turn = computeTurn('p1', makeLeg([170, 501], 0), [d('T20', 60), d('T20', 60), d('BULL', 50)], STD)
            expect(turn.isCheckout).toBe(true)
            expect(turn.turnScore).toBe(170)
            expect(turn.remainingAfter).toBe(0)
        })
    })

    describe('double-in', () => {
        it('scores 0 if no double is thrown on the opening turn', () => {
            const turn = computeTurn('p1', makeLeg([501, 501], 0), [d('T20', 60), d('20', 20), d('19', 19)], DIN)
            expect(turn.turnScore).toBe(0)
            expect(turn.remainingAfter).toBe(501)
        })

        it('scores only from the first double dart onwards', () => {
            // 20 (single) does not count, D20 opens scoring, T20 also counts
            const turn = computeTurn('p1', makeLeg([501, 501], 0), [d('20', 20), d('D20', 40), d('T20', 60)], DIN)
            expect(turn.turnScore).toBe(100)   // D20(40) + T20(60)
            expect(turn.remainingAfter).toBe(401)
        })

        it('counts all darts when first dart is already a double', () => {
            const turn = computeTurn('p1', makeLeg([501, 501], 0), [d('D20', 40), d('T20', 60), d('T19', 57)], DIN)
            expect(turn.turnScore).toBe(157)
            expect(turn.remainingAfter).toBe(344)
        })

        it('scores normally once the player has already opened', () => {
            // remaining < startingScore means double-in already achieved
            const turn = computeTurn('p1', makeLeg([344, 501], 0), [d('T20', 60), d('T20', 60), d('T20', 60)], DIN)
            expect(turn.turnScore).toBe(180)
            expect(turn.remainingAfter).toBe(164)
        })
    })
})

describe('applyTurnToLeg', () => {
    const base = makeLeg([501, 501], 0)
    const normalTurn = makeTurn({ remainingBefore: 501, remainingAfter: 441, darts: [d('T20', 60)], turnScore: 60 })

    it('updates remaining for the current player only', () => {
        const result = applyTurnToLeg(base, normalTurn)
        expect(result.remaining[0]).toBe(441)
        expect(result.remaining[1]).toBe(501)
    })

    it('appends turn to turns array', () => {
        const result = applyTurnToLeg(base, normalTurn)
        expect(result.turns).toHaveLength(1)
        expect(result.turns[0]).toBe(normalTurn)
    })

    it('toggles currentPlayerIndex on a normal turn', () => {
        expect(applyTurnToLeg(base, normalTurn).currentPlayerIndex).toBe(1)
    })

    it('does not toggle currentPlayerIndex on a checkout', () => {
        const checkoutTurn = makeTurn({ remainingBefore: 40, remainingAfter: 0, darts: [d('D20', 40)], isCheckout: true })
        const result = applyTurnToLeg(makeLeg([40, 501], 0), checkoutTurn)
        expect(result.currentPlayerIndex).toBe(0)
    })

    it('does not mutate the input leg', () => {
        applyTurnToLeg(base, normalTurn)
        expect(base.remaining).toEqual([501, 501])
        expect(base.turns).toHaveLength(0)
    })
})

describe('rebuildMatchState', () => {

    it('returns initial state when there are no events', () => {
        const state = rebuildMatchState(MATCH, [], STD)
        expect(state.legsWon).toEqual([0, 0])
        expect(state.status).toBe('active')
        expect(state.winnerId).toBeNull()
        expect(state.currentLeg.legNumber).toBe(1)
        expect(state.currentLeg.remaining).toEqual([501, 501])
    })

    it('applies throw events and sorts by sequence when out of order', () => {
        const turn1 = makeTurn({ playerId: 'p1', remainingBefore: 501, remainingAfter: 441, darts: [d('T20', 60)] })
        const turn2 = makeTurn({ playerId: 'p2', remainingBefore: 501, remainingAfter: 444, darts: [d('T19', 57)] })
        const events = [
            makeEvent(MatchEventType.Throw, 2, turn2),
            makeEvent(MatchEventType.Throw, 1, turn1),   // intentionally out of order
        ]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.currentLeg.remaining[0]).toBe(441)
        expect(state.currentLeg.remaining[1]).toBe(444)
        expect(state.currentLeg.turns).toHaveLength(2)
    })

    it('increments legsWon and starts a new leg on LegEnded + LegStarted', () => {
        const checkout = makeTurn({ remainingBefore: 40, remainingAfter: 0, darts: [d('D20', 40)], isCheckout: true })
        const events = [
            makeEvent(MatchEventType.Checkout, 1, checkout),
            makeEvent(MatchEventType.LegEnded, 2, { winnerId: 'p1' }),
            makeEvent(MatchEventType.LegStarted, 3),
        ]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.legsWon).toEqual([1, 0])
        expect(state.currentLeg.legNumber).toBe(2)
        expect(state.currentLeg.remaining).toEqual([501, 501])
        expect(state.status).toBe('active')
    })

    it('alternates startingPlayerIndex each leg', () => {
        const events = [
            makeEvent(MatchEventType.LegEnded, 1, { winnerId: 'p1' }),
            makeEvent(MatchEventType.LegStarted, 2),
        ]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.currentLeg.startingPlayerIndex).toBe(1)
    })

    it('sets status to leg_complete after LegEnded before LegStarted', () => {
        const events = [makeEvent(MatchEventType.LegEnded, 1, { winnerId: 'p1' })]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.status).toBe('leg_complete')
        expect(state.legsWon).toEqual([1, 0])
    })

    it('sets status and winnerId on MatchEnded', () => {
        const events = [makeEvent(MatchEventType.MatchEnded, 1, { winnerId: 'p2' })]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.status).toBe('match_complete')
        expect(state.winnerId).toBe('p2')
    })

    it('restores active status on Resumed', () => {
        const events = [
            makeEvent(MatchEventType.Paused, 1),
            makeEvent(MatchEventType.Resumed, 2),
        ]
        const state = rebuildMatchState(MATCH, events, STD)
        expect(state.status).toBe('active')
    })

    it('passes rules through to the returned state', () => {
        const state = rebuildMatchState(MATCH, [], STD)
        expect(state.rules).toBe(STD)
    })
})
