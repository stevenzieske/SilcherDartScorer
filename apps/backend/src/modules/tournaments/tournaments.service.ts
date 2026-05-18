import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { TournamentPhase, TournamentStatus } from '@dart/shared'
import type { BracketRound, CreateTournamentDto, LeagueStanding } from '@dart/shared'
import { TournamentModel, TournamentDocument } from './tournament.schema'
import { MatchesService } from '../matches/matches.service'
import { generateLeagueSchedule } from '../../core/scheduler/league-scheduler'
import { generateKnockoutBracket } from '../../core/scheduler/knockout-generator'

@Injectable()
export class TournamentsService {
    constructor(
        @InjectModel(TournamentModel.name)
        private readonly tournamentModel: Model<TournamentDocument>,
        private readonly matchesService: MatchesService,
        private readonly eventEmitter: EventEmitter2,
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

        const pairings = generateLeagueSchedule(tournament.players, tournament.rules.matchesPerPlayer ?? 3)
        const roundNumbers = [...new Set(pairings.map(p => p.roundNumber))].sort((a, b) => a - b)

        const leagueRounds = roundNumbers.map(roundNumber => ({
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
                ruleStartingScore: tournament.rules.startingScore,
                ruleDoubleIn: tournament.rules.doubleIn,
                ruleDoubleOut: tournament.rules.doubleOut,
                ruleLegsToWin: tournament.rules.groupLegsToWin,
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

    async advanceToKnockout(id: string, knockoutLegsToWin?: number): Promise<TournamentDocument> {
        const tournament = await this.findOne(id)

        if (tournament.status !== TournamentStatus.Active) {
            throw new BadRequestException('Tournament is not active')
        }
        if (tournament.phase !== TournamentPhase.League) {
            throw new BadRequestException('Tournament is not in league phase')
        }

        const knockoutSize = tournament.rules.knockoutSize
        if ((tournament.standings?.length ?? 0) < knockoutSize) {
            throw new BadRequestException(`Need at least ${knockoutSize} players in standings`)
        }

        if (knockoutLegsToWin && knockoutLegsToWin >= 1) {
            tournament.rules = { ...tournament.rules, knockoutLegsToWin } as any
            tournament.markModified('rules')
        }

        const topPlayers = (tournament.standings as LeagueStanding[])
            .slice(0, knockoutSize)
            .map(s => s.playerId)

        const bracket = generateKnockoutBracket(topPlayers, knockoutSize)

        for (const round of bracket) {
            if (round.roundNumber !== 1) continue
            for (const slot of round.slots) {
                if (slot.isBye || slot.player1 === 'BYE' || slot.player2 === 'BYE' ||
                    slot.player1 === 'TBD' || slot.player2 === 'TBD') continue

                const match = await this.matchesService.create({
                    tournamentId: id,
                    leagueRound: null,
                    roundNumber: round.roundNumber,
                    roundName: round.roundName,
                    slotIndex: slot.slotIndex,
                    players: [slot.player1 as string, slot.player2 as string],
                    ruleStartingScore: tournament.rules.startingScore,
                    ruleDoubleIn: tournament.rules.doubleIn,
                    ruleDoubleOut: tournament.rules.doubleOut,
                    ruleLegsToWin: tournament.rules.knockoutLegsToWin,
                })
                slot.matchId = match._id.toString()
            }
        }

        tournament.knockoutRounds = bracket as any
        tournament.phase = TournamentPhase.Knockout
        tournament.markModified('knockoutRounds')
        await tournament.save()

        this.eventEmitter.emit('tournament.phase.changed', { tournamentId: id, bracket })

        return tournament
    }

    async complete(id: string): Promise<TournamentDocument> {
        const tournament = await this.findOne(id)
        if (tournament.status === TournamentStatus.Completed) {
            throw new BadRequestException('Tournament is already completed')
        }
        tournament.status = TournamentStatus.Completed
        tournament.completedAt = new Date().toISOString()
        await tournament.save()
        this.eventEmitter.emit('tournament.updated', { tournamentId: id, status: TournamentStatus.Completed })
        return tournament
    }

    async delete(id: string): Promise<void> {
        await this.findOne(id)
        await this.matchesService.deleteAllForTournament(id)
        await this.tournamentModel.findByIdAndDelete(id).exec()
    }
}
