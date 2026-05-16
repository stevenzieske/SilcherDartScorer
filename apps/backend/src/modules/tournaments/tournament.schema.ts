import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { TournamentPhase, TournamentStatus } from '@dart/shared'
import type { BracketRound, BracketSlot, LeagueRound, LeagueStanding, ScheduledMatch, Tournament, TournamentRules } from '@dart/shared'

export type TournamentDocument = HydratedDocument<TournamentModel>

@Schema({ _id: false })
class ScheduledMatchSchema implements ScheduledMatch {
    @Prop({ required: true }) matchOrder: number
    @Prop({ required: true }) matchId: string
}

@Schema({ _id: false })
class LeagueRoundSchema implements LeagueRound {
    @Prop({ required: true }) roundNumber: number
    @Prop({ type: [ScheduledMatchSchema], default: [] }) matches: ScheduledMatch[]
}

@Schema({ _id: false })
class LeagueStandingSchema implements LeagueStanding {
    @Prop({ required: true }) playerId: string
    @Prop({ default: 0 }) played: number
    @Prop({ default: 0 }) won: number
    @Prop({ default: 0 }) lost: number
    @Prop({ default: 0 }) points: number
    @Prop({ default: 0 }) legsWon: number
    @Prop({ default: 0 }) legsLost: number
    @Prop({ default: 0 }) legDifference: number
    @Prop({ default: 0 }) average: number
}

@Schema({ _id: false })
class BacketSlotSchema implements BracketSlot {
    @Prop({ required: true }) slotIndex: number
    @Prop({ type: String, default: null }) matchId: string | null
    @Prop({ type: String, required: true }) player1: string | 'BYE' | 'TBD'
    @Prop({ type: String, required: true }) player2: string | 'BYE' | 'TBD'
    @Prop({ type: String, default: null }) winnerId: string | null
    @Prop({ type: String, default: null }) loserId: string | null
    @Prop({ required: true }) isBye: boolean
    @Prop({ type: Number, default: null }) playsFor: number | null
}

@Schema({ _id: false })
class BrackedRoundSchema implements BracketRound {
    @Prop({ required: true }) roundNumber: number
    @Prop({ required: true }) roundName: string
    @Prop({ type: String, enum: ['winners', 'consolation'], required: true }) bracketSide: 'winners' | 'consolation'
    @Prop({ type: [BacketSlotSchema], default: [] }) slots: BracketSlot[]
}

@Schema({ timestamps: { createdAt: 'createdAt' } })
export class TournamentModel implements Omit<Tournament, '_id' | 'createdAt'> {
    @Prop({ required: true, trim: true }) name: string
    @Prop({ type: String, enum: TournamentStatus, default: TournamentStatus.Draft }) status: TournamentStatus
    @Prop({ type: String, enum: TournamentPhase, default: TournamentPhase.League }) phase: TournamentPhase
    @Prop({ type: Object, required: true }) rules: TournamentRules
    @Prop({ type: [String], default: [] }) players: string[]
    @Prop({ type: [LeagueRoundSchema], default: [] }) leagueRounds: LeagueRound[]
    @Prop({ type: [LeagueStandingSchema], default: [] }) standings: LeagueStanding[]
    @Prop({ type: [BrackedRoundSchema], default: [] }) knockoutRounds: BracketRound[]
    @Prop({ type: Object, default: {} }) placements: Record<string, number>
    @Prop() startedAt?: string
    @Prop() completedAt?: string
}

export const TournamentSchema = SchemaFactory.createForClass(TournamentModel)

TournamentSchema.index({ status: 1 })
TournamentSchema.index({ 'standings.playerId': 1 })
