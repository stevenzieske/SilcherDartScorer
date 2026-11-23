import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { MatchEventsService } from './match-events.service'
import { MatchEventModel } from './match-event.schema'
import { MatchEventType } from '@dart/shared'

function makeChain(resolvedValue: unknown) {
    return {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(resolvedValue),
    }
}

describe('MatchEventsService', () => {
    let service: MatchEventsService
    let mockSave: jest.Mock
    let mockFindOne: jest.Mock
    let mockFindByIdAndDelete: jest.Mock
    let mockDeleteMany: jest.Mock
    let mockFind: jest.Mock

    beforeEach(async () => {
        mockSave = jest.fn().mockResolvedValue({ _id: 'evt1', sequence: 1 })
        mockFindOne = jest.fn()
        mockFindByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
        mockDeleteMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) })
        mockFind = jest.fn()

        const MockModel = jest.fn().mockImplementation(() => ({ save: mockSave }))
        Object.assign(MockModel, {
            findOne: mockFindOne,
            findByIdAndDelete: mockFindByIdAndDelete,
            deleteMany: mockDeleteMany,
            find: mockFind,
        })

        const module = await Test.createTestingModule({
            providers: [
                MatchEventsService,
                { provide: getModelToken(MatchEventModel.name), useValue: MockModel },
            ],
        }).compile()

        service = module.get(MatchEventsService)
    })

    // ── nextSequence ──────────────────────────────────────────────────────────

    describe('nextSequence', () => {
        it('returns 1 when no events exist', async () => {
            mockFindOne.mockReturnValue(makeChain(null))
            expect(await service.nextSequence('match1')).toBe(1)
        })

        it('returns last sequence + 1', async () => {
            mockFindOne.mockReturnValue(makeChain({ sequence: 5 }))
            expect(await service.nextSequence('match1')).toBe(6)
        })

        it('sorts descending to find the highest sequence', async () => {
            const chain = makeChain({ sequence: 3 })
            mockFindOne.mockReturnValue(chain)
            await service.nextSequence('match1')
            expect(chain.sort).toHaveBeenCalledWith({ sequence: -1 })
        })
    })

    // ── deleteLastThrow ───────────────────────────────────────────────────────

    describe('deleteLastThrow', () => {
        it('sorts descending to find the most recent throw', async () => {
            const chain = makeChain(null)
            mockFindOne.mockReturnValue(chain)
            await service.deleteLastThrow('match1')
            expect(chain.sort).toHaveBeenCalledWith({ sequence: -1 })
        })

        it('only targets Throw, Bust, and Checkout event types', async () => {
            const chain = makeChain(null)
            mockFindOne.mockReturnValue(chain)
            await service.deleteLastThrow('match1')
            expect(mockFindOne).toHaveBeenCalledWith({
                matchId: 'match1',
                type: { $in: [MatchEventType.Throw, MatchEventType.Bust, MatchEventType.Checkout] },
            })
        })

        it('returns null when no throw events exist', async () => {
            mockFindOne.mockReturnValue(makeChain(null))
            expect(await service.deleteLastThrow('match1')).toBeNull()
        })

        it('deletes system events after the last throw and then the throw itself', async () => {
            const lastThrow = { _id: 'evt3', sequence: 3, type: MatchEventType.Throw, data: null }
            mockFindOne.mockReturnValue(makeChain(lastThrow))
            await service.deleteLastThrow('match1')
            expect(mockDeleteMany).toHaveBeenCalledWith({ matchId: 'match1', sequence: { $gt: 3 } })
            expect(mockFindByIdAndDelete).toHaveBeenCalledWith('evt3')
        })
    })

    // ── append ────────────────────────────────────────────────────────────────

    describe('append', () => {
        it('saves a new event with the correct sequence number', async () => {
            mockFindOne.mockReturnValue(makeChain({ sequence: 3 }))
            await service.append('match1', 1, MatchEventType.Throw, 'judge1', null)
            expect(mockSave).toHaveBeenCalled()
        })

        it('uses sequence 1 when no prior events exist', async () => {
            mockFindOne.mockReturnValue(makeChain(null))
            const result = await service.append('match1', 1, MatchEventType.MatchStarted, 'system', null)
            expect(result.sequence).toBe(1)
        })
    })

    // ── findAllForMatches ─────────────────────────────────────────────────────

    describe('findAllForMatches', () => {
        it('returns an empty array immediately when matchIds is empty', async () => {
            const result = await service.findAllForMatches([])
            expect(result).toEqual([])
            expect(mockFind).not.toHaveBeenCalled()
        })

        it('queries with $in filter for the given matchIds', async () => {
            const events = [
                { _id: 'e1', matchId: 'match1', sequence: 1 },
                { _id: 'e2', matchId: 'match2', sequence: 1 },
            ]
            mockFind.mockReturnValue(makeChain(events))
            await service.findAllForMatches(['match1', 'match2'])
            expect(mockFind).toHaveBeenCalledWith({ matchId: { $in: ['match1', 'match2'] } })
        })

        it('sorts by matchId then sequence', async () => {
            const chain = makeChain([])
            mockFind.mockReturnValue(chain)
            await service.findAllForMatches(['match1'])
            expect(chain.sort).toHaveBeenCalledWith({ matchId: 1, sequence: 1 })
        })

        it('returns the events resolved by the model', async () => {
            const events = [{ _id: 'e1', matchId: 'match1', sequence: 1, type: MatchEventType.Throw }]
            mockFind.mockReturnValue(makeChain(events))
            const result = await service.findAllForMatches(['match1'])
            expect(result).toEqual(events)
        })
    })
})
