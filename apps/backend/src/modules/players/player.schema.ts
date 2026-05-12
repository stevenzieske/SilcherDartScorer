import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import type { Player, CareerStats } from '@dart/shared'


export type PlayerDocument = HydratedDocument<PlayerModel>

@Schema()
class CareerStatsSchema implements CareerStats {
    @Prop({ default: 0 }) matchesPlayed: number
    @Prop({ default: 0 }) matchesWon: number
    @Prop({ default: 0 }) legsPlayed: number
    @Prop({ default: 0 }) legsWon: number
    @Prop({ default: 0 }) dartsThrown: number
    @Prop({ default: 0 }) turnScoreTotal: number
    @Prop({ default: 0 }) turnsPlayed: number
    @Prop({ default: 0 }) checkoutAttempts: number
    @Prop({ default: 0 }) checkoutHits: number
    @Prop({ default: 0 }) oneEighties: number
    @Prop({ default: 0 }) highestCheckout: number
    @Prop({ default: 0 }) highestTurn: number
}

@Schema({ timestamps: { createdAt: 'createdAt' } })
export class PlayerModel implements Omit<Player, '_id' | 'createdAt'> {
    @Prop({ required: true, trim: true }) name: string
    @Prop() nickname?: string
    @Prop({ required: true }) avatarColor: string
    @Prop({ type: CareerStatsSchema, default: () => ({}) }) careerStats: CareerStats
}

export const PlayerSchema = SchemaFactory.createForClass(PlayerModel)

PlayerSchema.index({ name: 1 })
