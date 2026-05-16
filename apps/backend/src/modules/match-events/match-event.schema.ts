import * as mongoose from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { MatchEventType } from '@dart/shared'
import type { MatchEvent, TurnData } from '@dart/shared'

export type MatchEventDocument = HydratedDocument<MatchEventModel>

@Schema({ timestamps: false })
export class MatchEventModel implements Omit<MatchEvent, '_id'> {
    @Prop({ required: true }) matchId: string
    @Prop({ required: true }) legNumber: number
    @Prop({ required: true }) sequence: number
    @Prop({ type: String, enum: MatchEventType, required: true }) type: MatchEventType
    @Prop({ required: true }) actorId: string
    @Prop({ type: mongoose.Schema.Types.Mixed, default: null }) data: TurnData | { winnerId: string } | null
    @Prop({ required: true }) timestamp: string
}

export const MatchEventSchema = SchemaFactory.createForClass(MatchEventModel)

MatchEventSchema.index({ matchId: 1, sequence: 1 }, { unique: true })
MatchEventSchema.index({ matchId: 1, type: 1 })
