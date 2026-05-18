import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { MatchesService } from './matches.service'
import { MatchModel } from './match.schema'
import { TournamentModel } from '../tournaments/tournament.schema'
import { MatchEventsService } from '../match-events/match-events.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MatchEventType, MatchStatus } from '@dart/shared'
import type { MatchEvent, MatchRules, TurnData } from '@dart/shared'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEventDoc(partial: Partial<MatchEvent> & { sequence: number }) {
    const obj: MatchEvent = {
        _id: `evt-${partial.sequence}`,
        matchId: 'match1',
        legNumber: 1,
        actorId: 'system',
        data: null,
        timestamp: new Date().toISOString(),
        ...partial,
    }
    return { ...obj, toObject: jest.fn().mockReturnValue(obj) }
}

function makeMockMatch(overrides: Record<string, unknown> = {}) {
    const legsWon: number[] = [...((overrides.legsWon as number[]) ?? [0, 0])]
    const setsWon: number[] = [...((overrides.setsWon as number[]) ?? [0, 0])]
    const base = {
        _id: { toString: () => 'match1' },
        tournamentId: 'tour1',
        status: MatchStatus.Active,
        players: ['p1', 'p2'],
        legsWon,
        setsWon,
        currentLegNumber: 1,
        winnerId: null,
        leagueRound: 1,
        roundNumber: null,
        slotIndex: null,
        board: 1,
        judgeId: null,
        startedAt: null,
        endedAt: null,
        startingPlayerIndex: 0,
        isQuickMatch: false,
        ruleStartingScore: null,
        ruleDoubleIn: null,
        ruleDoubleOut: null,
        ruleLegsToWin: null,
        ruleSetsToWin: null,
        ...overrides,
        markModified: jest.fn(),
    }
    const mock = {
        ...base,
        save: jest.fn(),
        toObject: jest.fn().mockReturnValue({ ...base, _id: 'match1' }),
    }
    mock.save.mockResolvedValue(mock)
    return mock
}

const DEFAULT_RULES: MatchRules = {
    startingScore: 501,
    legsToWin: 2,
    doubleIn: false,
    doubleOut: true,
    setsToWin: 0,
}

// ── Setup ────────────────────────────────────────────────────────────────────

describe('MatchesService', () => {
    let service: MatchesService
    let mockFindById: jest.Mock
    let mockMatchEventsService: {
        findAllForMatch: jest.Mock
        append: jest.Mock
        deleteLastThrow: jest.Mock
    }
    let mockEventEmitter: { emit: jest.Mock }

    beforeEach(async () => {
        mockFindById = jest.fn()
        mockMatchEventsService = {
            findAllForMatch: jest.fn(),
            append: jest.fn().mockResolvedValue({}),
            deleteLastThrow: jest.fn(),
        }
        mockEventEmitter = { emit: jest.fn() }

        const MockMatchModel = jest.fn().mockImplementation((data) => ({ ...data, save: jest.fn().mockResolvedValue(data) }))
        Object.assign(MockMatchModel, {
            findById: mockFindById,
            find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        })

        const MockTournamentModel = jest.fn()
        Object.assign(MockTournamentModel, {
            findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        })

        const module = await Test.createTestingModule({
            providers: [
                MatchesService,
                { provide: getModelToken(MatchModel.name), useValue: MockMatchModel },
                { provide: getModelToken(TournamentModel.name), useValue: MockTournamentModel },
                { provide: MatchEventsService, useValue: mockMatchEventsService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile()

        service = module.get(MatchesService)
    })

    // ── findOne ───────────────────────────────────────────────────────────────

    describe('findOne', () => {
        it('returns the match when found', async () => {
            const match = makeMockMatch()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            expect(await service.findOne('match1')).toBe(match)
        })

        it('throws NotFoundException when match does not exist', async () => {
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
            await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
        })
    })

    // ── submitThrow ───────────────────────────────────────────────────────────

    describe('submitThrow', () => {
        function setupMatch(matchOverrides = {}, events: ReturnType<typeof makeEventDoc>[] = []) {
            const match = makeMockMatch(matchOverrides)
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            // Provide a MatchStarted event so rebuildMatchState has a valid starting state
            const defaultEvents = [
                makeEventDoc({ sequence: 1, type: MatchEventType.MatchStarted }),
                ...events,
            ]
            mockMatchEventsService.findAllForMatch.mockResolvedValue(defaultEvents)
            return match
        }

        it('appends a Throw event for a normal turn', async () => {
            setupMatch()
            await service.submitThrow('match1', 'judge1', ['T20', 'T19', 'T18'],
                DEFAULT_RULES.startingScore, DEFAULT_RULES.legsToWin, DEFAULT_RULES.doubleIn, DEFAULT_RULES.doubleOut, 0)
            expect(mockMatchEventsService.append).toHaveBeenCalledWith(
                'match1', 1, MatchEventType.Throw, 'judge1', expect.any(Object)
            )
        })

        it('appends a Bust event when the score exceeds remaining', async () => {
            // Set up state: player 0 has 5 remaining (501 - 496 scored)
            const priorThrow: TurnData = {
                playerId: 'p1', legNumber: 1, darts: [],
                turnScore: 496, remainingBefore: 501, remainingAfter: 5,
                isBust: false, isCheckout: false,
            }
            setupMatch({}, [
                makeEventDoc({ sequence: 2, type: MatchEventType.Throw, data: priorThrow }),
                // Player 1 throws, switches back to player 0
                makeEventDoc({
                    sequence: 3, type: MatchEventType.Throw, data: {
                        playerId: 'p2', legNumber: 1, darts: [],
                        turnScore: 100, remainingBefore: 501, remainingAfter: 401,
                        isBust: false, isCheckout: false,
                    }
                }),
            ])
            // Player 0 has 5 remaining, throws T20 (60) — busts
            await service.submitThrow('match1', 'judge1', ['T20'],
                DEFAULT_RULES.startingScore, DEFAULT_RULES.legsToWin, DEFAULT_RULES.doubleIn, DEFAULT_RULES.doubleOut, 0)
            expect(mockMatchEventsService.append).toHaveBeenCalledWith(
                'match1', 1, MatchEventType.Bust, 'judge1', expect.any(Object)
            )
        })

        it('appends Checkout + LegEnded and increments legsWon on checkout', async () => {
            // Player 0 has 40 remaining → D20 checks out
            const priorThrow: TurnData = {
                playerId: 'p1', legNumber: 1, darts: [],
                turnScore: 461, remainingBefore: 501, remainingAfter: 40,
                isBust: false, isCheckout: false,
            }
            const match = setupMatch({}, [
                makeEventDoc({ sequence: 2, type: MatchEventType.Throw, data: priorThrow }),
                makeEventDoc({
                    sequence: 3, type: MatchEventType.Throw, data: {
                        playerId: 'p2', legNumber: 1, darts: [],
                        turnScore: 100, remainingBefore: 501, remainingAfter: 401,
                        isBust: false, isCheckout: false,
                    }
                }),
            ])

            await service.submitThrow('match1', 'judge1', ['D20'],
                DEFAULT_RULES.startingScore, DEFAULT_RULES.legsToWin, DEFAULT_RULES.doubleIn, DEFAULT_RULES.doubleOut, 0)

            expect(mockMatchEventsService.append).toHaveBeenCalledWith(
                'match1', 1, MatchEventType.Checkout, 'judge1', expect.any(Object)
            )
            expect(mockMatchEventsService.append).toHaveBeenCalledWith(
                'match1', 1, MatchEventType.LegEnded, 'system', { winnerId: 'p1' }
            )
            expect(match.legsWon[0]).toBe(1)
            expect(match.save).toHaveBeenCalled()
        })

        it('appends MatchEnded and sets winnerId when legsToWin is reached', async () => {
            // p2 already won leg 1. In leg 2, p2 (index 1) starts first (alternates from leg 1).
            // p2 throws to leave 40 remaining, p1 throws, then p2 checkouts with D20 → match over.
            const match = setupMatch({ legsWon: [0, 1] }, [
                makeEventDoc({ sequence: 2, type: MatchEventType.LegEnded, data: { winnerId: 'p2' } }),
                makeEventDoc({ sequence: 3, type: MatchEventType.LegStarted }),
                // Leg 2: p2 (index 1) starts — throws to leave 40 remaining
                makeEventDoc({
                    sequence: 4, type: MatchEventType.Throw, data: {
                        playerId: 'p2', legNumber: 2, darts: [],
                        turnScore: 461, remainingBefore: 501, remainingAfter: 40,
                        isBust: false, isCheckout: false,
                    }
                }),
                // p1 (index 0) throws — switches back to p2
                makeEventDoc({
                    sequence: 5, type: MatchEventType.Throw, data: {
                        playerId: 'p1', legNumber: 2, darts: [],
                        turnScore: 100, remainingBefore: 501, remainingAfter: 401,
                        isBust: false, isCheckout: false,
                    }
                }),
            ])

            await service.submitThrow('match1', 'judge1', ['D20'],
                DEFAULT_RULES.startingScore, DEFAULT_RULES.legsToWin, DEFAULT_RULES.doubleIn, DEFAULT_RULES.doubleOut, 0)

            expect(mockMatchEventsService.append).toHaveBeenCalledWith(
                'match1', expect.any(Number), MatchEventType.MatchEnded, 'system', { winnerId: 'p2' }
            )
            expect(match.winnerId).toBe('p2')
            expect(match.status).toBe(MatchStatus.Completed)
        })

        it('throws BadRequestException if match is not active', async () => {
            setupMatch({ status: MatchStatus.Paused })
            await expect(
                service.submitThrow('match1', 'judge1', ['T20'],
                    DEFAULT_RULES.startingScore, DEFAULT_RULES.legsToWin, DEFAULT_RULES.doubleIn, DEFAULT_RULES.doubleOut, 0)
            ).rejects.toThrow(BadRequestException)
        })
    })

    // ── undo ─────────────────────────────────────────────────────────────────

    describe('undo', () => {
        it('throws BadRequestException if nothing to undo', async () => {
            const match = makeMockMatch()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            mockMatchEventsService.deleteLastThrow.mockResolvedValue(null)
            mockMatchEventsService.findAllForMatch.mockResolvedValue([])
            await expect(service.undo('match1', DEFAULT_RULES)).rejects.toThrow(BadRequestException)
        })

        it('returns undoneNotations after successful undo', async () => {
            const match = makeMockMatch()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            const deletedTurn: TurnData = {
                playerId: 'p1', legNumber: 1,
                darts: [{ notation: 'T20', score: 60 }],
                turnScore: 60, remainingBefore: 501, remainingAfter: 441,
                isBust: false, isCheckout: false,
            }
            mockMatchEventsService.deleteLastThrow.mockResolvedValue({ _id: 'evt1', data: deletedTurn })
            mockMatchEventsService.findAllForMatch.mockResolvedValue([])
            const result = await service.undo('match1', DEFAULT_RULES)
            expect(result.undoneNotations).toEqual(['T20'])
        })
    })

    // ── pause / resume ────────────────────────────────────────────────────────

    describe('pause', () => {
        it('sets status to Paused', async () => {
            const match = makeMockMatch()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            await service.pause('match1')
            expect(match.status).toBe(MatchStatus.Paused)
        })

        it('throws if match is not active', async () => {
            const match = makeMockMatch({ status: MatchStatus.Paused })
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            await expect(service.pause('match1')).rejects.toThrow(BadRequestException)
        })
    })

    describe('resume', () => {
        it('sets status back to Active', async () => {
            const match = makeMockMatch({ status: MatchStatus.Paused })
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            await service.resume('match1')
            expect(match.status).toBe(MatchStatus.Active)
        })

        it('throws if match is not paused', async () => {
            const match = makeMockMatch({ status: MatchStatus.Active })
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(match) })
            await expect(service.resume('match1')).rejects.toThrow(BadRequestException)
        })
    })
})
