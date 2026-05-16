import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { MatchDocument, MatchModel } from "./match.schema";
import { Model } from "mongoose";
import { MatchEventsService } from "../match-events/match-events.service";
import { MatchEventType, MatchStatus } from "@dart/shared";
import type { MatchRules } from "@dart/shared";
import { computeTurn, rebuildMatchState } from "../../core/match-engine/match-engine";
import { parseNotation } from "../../core/match-engine/dart-parser";

@Injectable()
export class MatchesService {
    constructor(
        @InjectModel(MatchModel.name)
        private readonly matchModel: Model<MatchDocument>,
        private readonly matchEventsService: MatchEventsService,
    ) { }

    async findAll(status?: string): Promise<MatchDocument[]> {
        const filter = status ? { status: status as MatchStatus } : {}
        return this.matchModel.find(filter).exec()
    }

    async findOne(id: string): Promise<MatchDocument> {
        const match = await this.matchModel.findById(id).exec()
        if (!match) throw new NotFoundException()
        return match
    }

    create(data: Partial<MatchDocument>): Promise<MatchDocument> {
        return new this.matchModel(data).save()
    }

    async start(id: string): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Pending) {
            throw new BadRequestException('Match is not pending')
        }

        match.status = MatchStatus.Active
        match.startedAt = new Date().toISOString()
        await match.save()

        await this.matchEventsService.append(id, 1, MatchEventType.MatchStarted, 'system')

        return match
    }

    async submitThrow(
        id: string,
        judgeId: string,
        notations: string[],
        startingScore: number,
        legsToWin: number,
        doubleIn: boolean,
        doubleOut: boolean,
    ): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Active) {
            throw new BadRequestException('Match is not active')
        }

        const events = await this.matchEventsService.findAllForMatch(id)
        const rules: MatchRules = { startingScore, doubleIn, doubleOut, legsToWin }
        const matchObj = { ...match.toObject(), _id: id }
        const eventObjs = events.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
        const state = rebuildMatchState(matchObj, eventObjs, rules)

        const darts = notations.map(n => {
            const score = parseNotation(n)
            return { notation: n.toUpperCase(), score }
        })

        const turn = computeTurn(
            state.currentLeg.currentPlayerIndex === 0 ? match.players[0] : match.players[1],
            state.currentLeg,
            darts,
            rules
        )

        const eventType = turn.isCheckout
            ? MatchEventType.Checkout
            : turn.isBust
                ? MatchEventType.Bust
                : MatchEventType.Throw

        await this.matchEventsService.append(id, state.currentLeg.legNumber, eventType, judgeId, turn)


        if (turn.isCheckout) {
            const legWinner = turn.playerId === match.players[0] ? 0 : 1
            match.legsWon[legWinner]++
            match.markModified('legsWon')

            await this.matchEventsService.append(id, state.currentLeg.legNumber,
                MatchEventType.LegEnded, 'system', { winnerId: turn.playerId })

            if (match.legsWon[legWinner] >= legsToWin) {
                match.winnerId = turn.playerId
                match.status = MatchStatus.Completed
                match.endedAt = new Date().toISOString()
                await this.matchEventsService.append(id, state.currentLeg.legNumber,
                    MatchEventType.MatchEnded, 'system', { winnerId: turn.playerId })
            } else {
                const nextLeg = state.currentLeg.legNumber + 1
                match.currentLegNumber = nextLeg
                await this.matchEventsService.append(id, nextLeg,
                    MatchEventType.LegStarted, 'system')
            }

            await match.save()
        }

        return match
    }

    async undo(id: string): Promise<MatchDocument> {
        const match = await this.findOne(id)
        const deleted = await this.matchEventsService.deleteLastThrow(id)
        if (!deleted) throw new BadRequestException('Nothing to undo')
        return match
    }

    async pause(id: string): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Active) throw new BadRequestException('Match is not active')
        match.status = MatchStatus.Paused
        return match.save()
    }

    async resume(id: string): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Paused) throw new BadRequestException('Match is not paused')
        match.status = MatchStatus.Active
        return match.save()
    }
}
