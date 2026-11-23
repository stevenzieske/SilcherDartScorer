import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TournamentsService } from './tournaments.service'
import { TournamentModel } from './tournament.schema'
import { MatchesService } from '../matches/matches.service'
import { TournamentStatus } from '@dart/shared'

// ── Helpers ───────────────────────────────────────────────────────────────────

let matchCounter = 0

function makeMockTournament(overrides: Record<string, unknown> = {}) {
    const base = {
        _id: { toString: () => 'tour1' },
        name: 'Test Tournament',
        status: TournamentStatus.Draft,
        players: ['p1', 'p2', 'p3', 'p4'],
        leagueRounds: [] as any[],
        standings: [] as any[],
        startedAt: undefined as string | undefined,
        rules: {
            startingScore: 501,
            doubleIn: false,
            doubleOut: true,
            groupLegsToWin: 2,
            knockoutLegsToWin: 3,
            boardCount: 2,
            knockoutSize: 4,
        },
        ...overrides,
        markModified: jest.fn(),
    }
    const mock = { ...base, save: jest.fn() }
    mock.save.mockResolvedValue(mock)
    return mock
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('TournamentsService', () => {
    let service: TournamentsService
    let mockFindById: jest.Mock
    let mockFindByIdAndDelete: jest.Mock
    let mockFind: jest.Mock
    let mockMatchesService: { create: jest.Mock; deleteAllForTournament: jest.Mock }

    beforeEach(async () => {
        matchCounter = 0
        mockFindById = jest.fn()
        mockFindByIdAndDelete = jest.fn()
        mockFind = jest.fn()
        mockMatchesService = {
            create: jest.fn().mockImplementation(() => {
                matchCounter++
                return Promise.resolve({ _id: { toString: () => `match${matchCounter}` } })
            }),
            deleteAllForTournament: jest.fn().mockResolvedValue(undefined),
        }

        const MockModel = jest.fn().mockImplementation((data) => {
            const doc = { ...data, save: jest.fn().mockResolvedValue(data) }
            return doc
        })
        Object.assign(MockModel, {
            findById: mockFindById,
            findByIdAndDelete: mockFindByIdAndDelete,
            find: mockFind,
        })

        const module = await Test.createTestingModule({
            providers: [
                TournamentsService,
                { provide: getModelToken(TournamentModel.name), useValue: MockModel },
                { provide: MatchesService, useValue: mockMatchesService },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile()

        service = module.get(TournamentsService)
    })

    // ── findOne ───────────────────────────────────────────────────────────────

    describe('findOne', () => {
        it('returns the tournament when found', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            expect(await service.findOne('tour1')).toBe(tournament)
        })

        it('throws NotFoundException when tournament does not exist', async () => {
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
            await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
        })
    })

    // ── start ─────────────────────────────────────────────────────────────────

    describe('start', () => {
        it('throws BadRequestException if tournament is not in Draft status', async () => {
            const tournament = makeMockTournament({ status: TournamentStatus.Active })
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await expect(service.start('tour1')).rejects.toThrow(BadRequestException)
        })

        it('creates Match documents for all 3 rounds', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            // 4 players = 2 matches per round × 3 rounds = 6 matches
            expect(mockMatchesService.create).toHaveBeenCalledTimes(6)
        })

        it('populates leagueRounds with 3 rounds', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            expect(tournament.leagueRounds).toHaveLength(3)
        })

        it('fills in matchIds in leagueRounds', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            for (const round of tournament.leagueRounds as any[]) {
                for (const match of round.matches) {
                    expect(match.matchId).not.toBe('')
                }
            }
        })

        it('initialises standings with one entry per player', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            expect(tournament.standings).toHaveLength(4)
            const playerIds = (tournament.standings as any[]).map((s: any) => s.playerId)
            expect(playerIds).toEqual(expect.arrayContaining(['p1', 'p2', 'p3', 'p4']))
        })

        it('initialises all standing counters to zero', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            for (const standing of tournament.standings as any[]) {
                expect(standing.played).toBe(0)
                expect(standing.won).toBe(0)
                expect(standing.points).toBe(0)
            }
        })

        it('sets status to Active and saves', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            expect(tournament.status).toBe(TournamentStatus.Active)
            expect(tournament.save).toHaveBeenCalled()
        })

        it('sets startedAt timestamp', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.start('tour1')
            expect(tournament.startedAt).toBeDefined()
        })
    })

    // ── delete ────────────────────────────────────────────────────────────────

    describe('delete', () => {
        it('deletes a Draft tournament', async () => {
            const tournament = makeMockTournament()
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            mockFindByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await expect(service.delete('tour1')).resolves.toBeUndefined()
            expect(mockFindByIdAndDelete).toHaveBeenCalledWith('tour1')
        })

        it('calls deleteAllForTournament before removing the document', async () => {
            const tournament = makeMockTournament({ status: TournamentStatus.Active })
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            mockFindByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(tournament) })
            await service.delete('tour1')
            expect(mockMatchesService.deleteAllForTournament).toHaveBeenCalledWith('tour1')
        })
    })
})
