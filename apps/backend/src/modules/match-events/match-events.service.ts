import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { MatchEventDocument, MatchEventModel } from "./match-event.schema";
import { Model } from "mongoose";
import type { TurnData } from "@dart/shared";
import { MatchEventType } from "@dart/shared";

@Injectable()
export class MatchEventsService {
    constructor(
        @InjectModel(MatchEventModel.name)
        private readonly eventModel: Model<MatchEventDocument>
    ) { }

    findAllForMatch(matchId: string): Promise<MatchEventDocument[]> {
        return this.eventModel
            .find({ matchId })
            .sort({ sequence: 1 })
            .exec()
    }

    async nextSequence(matchId: string): Promise<number> {
        const last = await this.eventModel
            .findOne({ matchId })
            .sort({ sequence: -1 })
            .exec()
        return last ? last.sequence + 1 : 1
    }

    async append(
        matchId: string,
        legNumber: number,
        type: MatchEventType,
        actorId: string,
        data: TurnData | { winnerId: string } | null = null,
    ): Promise<MatchEventDocument> {
        const sequence = await this.nextSequence(matchId)
        return new this.eventModel({
            matchId,
            legNumber,
            sequence,
            type,
            actorId,
            data,
            timestamp: new Date().toISOString(),
        }).save()
    }

    deleteLastThrow(matchId: string): Promise<MatchEventDocument | null> {
        return this.eventModel
            .findOneAndDelete({
                matchId,
                type: { $in: [MatchEventType.Throw, MatchEventType.Bust, MatchEventType.Checkout] },
            })
            .sort({ sequence: -1 })
            .exec()
    }
}
