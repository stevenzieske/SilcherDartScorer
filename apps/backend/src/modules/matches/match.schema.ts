import type { Match } from '@dart/shared'
import { MatchStatus } from '@dart/shared'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type MatchDocument = HydratedDocument<MatchModel>

@Schema({ timestamps: false })
export class MatchModel implements Omit<Match, '_id'> {
    @Prop({ required: true }) tournamentId: string
    @Prop({ type: Number, default: null }) leagueRound: number | null
    @Prop({ type: Number, default: null }) roundNumber: number | null
    @Prop({ type: Number, default: null }) slotIndex: number | null
    @Prop({ type: Number, default: null }) board: number | null
    @Prop({ type: String, enum: MatchStatus, default: MatchStatus.Pending }) status: MatchStatus
    @Prop({ type: [String], required: true }) players: [string, string]
    @Prop({ default: 1 }) currentLegNumber: number
    @Prop({ type: [Number], default: [0, 0] }) legsWon: [number, number]
    @Prop({ type: String, default: null }) winnerId: string | null
    @Prop({ type: String, default: null }) judgeId: string | null
    @Prop({ type: String, default: null }) startedAt: string | null
    @Prop({ type: String, default: null }) endedAt: string | null
    @Prop({ default: 0 }) startingPlayerIndex: number
}

export const MatchSchema = SchemaFactory.createForClass(MatchModel)

MatchSchema.index({ tournamentId: 1, status: 1 })
MatchSchema.index({ board: 1, status: 1 })
MatchSchema.index({ tournamentId: 1, leagueRound: 1 })
MatchSchema.index({ tournamentId: 1, roundNumber: 1 })
