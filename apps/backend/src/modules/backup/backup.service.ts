import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { PlayerDocument, PlayerModel } from '../players/player.schema'
import { TournamentDocument, TournamentModel } from '../tournaments/tournament.schema'
import { MatchDocument, MatchModel } from '../matches/match.schema'
import { MatchEventDocument, MatchEventModel } from '../match-events/match-event.schema'

export interface BackupPayload {
    version: number
    exportedAt: string
    players: unknown[]
    tournaments: unknown[]
    matches: unknown[]
    matchEvents: unknown[]
}

function toObjectId(docs: Record<string, unknown>[]): Record<string, unknown>[] {
    return docs.map(doc => ({
        ...doc,
        _id: typeof doc._id === 'string' ? new Types.ObjectId(doc._id) : doc._id,
    }))
}

@Injectable()
export class BackupService {
    constructor(
        @InjectModel(PlayerModel.name) private readonly playerModel: Model<PlayerDocument>,
        @InjectModel(TournamentModel.name) private readonly tournamentModel: Model<TournamentDocument>,
        @InjectModel(MatchModel.name) private readonly matchModel: Model<MatchDocument>,
        @InjectModel(MatchEventModel.name) private readonly matchEventModel: Model<MatchEventDocument>,
    ) { }

    async exportAll(): Promise<BackupPayload> {
        const [players, tournaments, matches, matchEvents] = await Promise.all([
            this.playerModel.find().lean().exec(),
            this.tournamentModel.find().lean().exec(),
            this.matchModel.find().lean().exec(),
            this.matchEventModel.find().sort({ matchId: 1, sequence: 1 }).lean().exec(),
        ])
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            players,
            tournaments,
            matches,
            matchEvents,
        }
    }

    async nukeAll(): Promise<void> {
        await Promise.all([
            this.matchEventModel.deleteMany({}),
            this.matchModel.deleteMany({}),
            this.tournamentModel.deleteMany({}),
            this.playerModel.deleteMany({}),
        ])
    }

    async importAll(data: BackupPayload): Promise<void> {
        if (data?.version !== 1) throw new BadRequestException('Unsupported backup version')

        await Promise.all([
            this.matchEventModel.deleteMany({}),
            this.matchModel.deleteMany({}),
            this.tournamentModel.deleteMany({}),
            this.playerModel.deleteMany({}),
        ])

        if (data.players?.length)
            await this.playerModel.collection.insertMany(toObjectId(data.players as Record<string, unknown>[]))
        if (data.tournaments?.length)
            await this.tournamentModel.collection.insertMany(toObjectId(data.tournaments as Record<string, unknown>[]))
        if (data.matches?.length)
            await this.matchModel.collection.insertMany(toObjectId(data.matches as Record<string, unknown>[]))
        if (data.matchEvents?.length)
            await this.matchEventModel.collection.insertMany(toObjectId(data.matchEvents as Record<string, unknown>[]))
    }
}
