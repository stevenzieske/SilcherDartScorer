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
    let mockFindOneAndDelete: jest.Mock
    let mockFind: jest.Mock

    beforeEach(async () => {
        mockSave = jest.fn().mockResolvedValue({ _id: 'evt1', sequence: 1 })
        mockFindOne = jest.fn()
        mockFindOneAndDelete = jest.fn()
        mockFind = jest.fn()

        const MockModel = jest.fn().mockImplementation(() => ({ save: mockSave }))
        Object.assign(MockModel, {
            findOne: mockFindOne,
            findOneAndDelete: mockFindOneAndDelete,
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
        it('sorts descending to delete the most recent throw', async () => {
            const chain = makeChain(null)
            mockFindOneAndDelete.mockReturnValue(chain)
            await service.deleteLastThrow('match1')
            expect(chain.sort).toHaveBeenCalledWith({ sequence: -1 })
        })

        it('only targets Throw, Bust, and Checkout event types', async () => {
            const chain = makeChain(null)
            mockFindOneAndDelete.mockReturnValue(chain)
            await service.deleteLastThrow('match1')
            expect(mockFindOneAndDelete).toHaveBeenCalledWith({
                matchId: 'match1',
                type: { $in: [MatchEventType.Throw, MatchEventType.Bust, MatchEventType.Checkout] },
            })
        })

        it('returns null when no throw events exist', async () => {
            mockFindOneAndDelete.mockReturnValue(makeChain(null))
            expect(await service.deleteLastThrow('match1')).toBeNull()
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
})
