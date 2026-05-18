import type { Match } from '@dart/shared'
import { MatchStatus } from '@dart/shared'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type MatchDocument = HydratedDocument<MatchModel>

@Schema({ timestamps: false })
export class MatchModel implements Omit<Match, '_id'> {
    @Prop({ type: String, default: null }) tournamentId: string | null
    @Prop({ type: Number, default: null }) leagueRound: number | null
    @Prop({ type: Number, default: null }) roundNumber: number | null
    @Prop({ type: String, default: null }) roundName: string | null
    @Prop({ type: Number, default: null }) slotIndex: number | null
    @Prop({ type: Number, default: null }) board: number | null
    @Prop({ type: String, enum: MatchStatus, default: MatchStatus.Pending }) status: MatchStatus
    @Prop({ type: [String], required: true }) players: string[]
    @Prop({ default: 1 }) currentLegNumber: number
    @Prop({ type: [Number], default: [0, 0] }) legsWon: number[]
    @Prop({ type: [Number], default: [] }) setsWon: number[]
    @Prop({ type: String, default: null }) winnerId: string | null
    @Prop({ type: String, default: null }) judgeId: string | null
    @Prop({ type: String, default: null }) startedAt: string | null
    @Prop({ type: String, default: null }) endedAt: string | null
    @Prop({ default: 0 }) startingPlayerIndex: number
    @Prop({ default: false }) isQuickMatch: boolean
    @Prop({ type: Number, default: null }) ruleStartingScore: number | null
    @Prop({ type: Boolean, default: null }) ruleDoubleIn: boolean | null
    @Prop({ type: Boolean, default: null }) ruleDoubleOut: boolean | null
    @Prop({ type: Number, default: null }) ruleLegsToWin: number | null
    @Prop({ type: Number, default: null }) ruleSetsToWin: number | null
}

export const MatchSchema = SchemaFactory.createForClass(MatchModel)

MatchSchema.index({ tournamentId: 1, status: 1 })
MatchSchema.index({ board: 1, status: 1 })
MatchSchema.index({ tournamentId: 1, leagueRound: 1 })
MatchSchema.index({ tournamentId: 1, roundNumber: 1 })
MatchSchema.index({ isQuickMatch: 1, status: 1 })
