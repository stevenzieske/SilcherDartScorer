import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { TournamentStatus } from '@dart/shared'
import type { CreateTournamentDto, LeagueStanding } from '@dart/shared'
import { TournamentModel, TournamentDocument } from './tournament.schema'
import { MatchesService } from '../matches/matches.service'
import { generateLeagueSchedule } from '../../core/scheduler/league-scheduler'

@Injectable()
export class TournamentsService {
    constructor(
        @InjectModel(TournamentModel.name)
        private readonly tournamentModel: Model<TournamentDocument>,
        private readonly matchesService: MatchesService,
    ) {}

    findAll(): Promise<TournamentDocument[]> {
        return this.tournamentModel.find().sort({ createdAt: -1 }).exec()
    }

    async findOne(id: string): Promise<TournamentDocument> {
        const tournament = await this.tournamentModel.findById(id).exec()
        if (!tournament) throw new NotFoundException()
        return tournament
    }

    create(dto: CreateTournamentDto): Promise<TournamentDocument> {
        return new this.tournamentModel({
            name: dto.name,
            rules: dto.rules,
            players: dto.playerIds,
        }).save()
    }

    async start(id: string): Promise<TournamentDocument> {
        const tournament = await this.findOne(id)
        if (tournament.status !== TournamentStatus.Draft) {
            throw new BadRequestException('Tournament is not in Draft status')
        }

        const pairings = generateLeagueSchedule(tournament.players)

        const leagueRounds = [1, 2, 3].map(roundNumber => ({
            roundNumber,
            matches: pairings
                .filter(p => p.roundNumber === roundNumber)
                .map(p => ({ matchOrder: p.matchOrder, matchId: '' })),
        }))

        for (const pairing of pairings) {
            const match = await this.matchesService.create({
                tournamentId: id,
                leagueRound: pairing.roundNumber,
                players: pairing.players,
            })

            const round = leagueRounds.find(r => r.roundNumber === pairing.roundNumber)!
            const slot = round.matches.find(m => m.matchOrder === pairing.matchOrder)!
            slot.matchId = match._id.toString()
        }

        const standings: LeagueStanding[] = tournament.players.map(playerId => ({
            playerId,
            played: 0, won: 0, lost: 0, points: 0,
            legsWon: 0, legsLost: 0, legDifference: 0, average: 0,
        }))

        tournament.leagueRounds = leagueRounds as any
        tournament.standings = standings as any
        tournament.status = TournamentStatus.Active
        tournament.startedAt = new Date().toISOString()
        tournament.markModified('leagueRounds')
        tournament.markModified('standings')

        return tournament.save()
    }

    async delete(id: string): Promise<void> {
        const tournament = await this.findOne(id)
        if (tournament.status !== TournamentStatus.Draft) {
            throw new BadRequestException('Only Draft tournaments can be deleted')
        }
        await this.tournamentModel.findByIdAndDelete(id).exec()
    }
}
