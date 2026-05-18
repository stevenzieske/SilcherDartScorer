import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { MatchDocument, MatchModel } from "./match.schema";
import { TournamentDocument, TournamentModel } from "../tournaments/tournament.schema";
import { Model } from "mongoose";
import { MatchEventsService } from "../match-events/match-events.service";
import { MatchEventType, MatchStatus } from "@dart/shared";
import type { LeagueStanding, MatchRules, MatchState, TurnData } from "@dart/shared";
import { computeTurn, rebuildMatchState } from "../../core/match-engine/match-engine";
import { parseNotation } from "../../core/match-engine/dart-parser";

@Injectable()
export class MatchesService {
    constructor(
        @InjectModel(MatchModel.name)
        private readonly matchModel: Model<MatchDocument>,
        @InjectModel(TournamentModel.name)
        private readonly tournamentModel: Model<TournamentDocument>,
        private readonly matchEventsService: MatchEventsService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async findAll(status?: string, tournamentId?: string, isQuickMatch?: boolean): Promise<MatchDocument[]> {
        const filter: Record<string, unknown> = {}
        if (status) filter.status = status as MatchStatus
        if (tournamentId) filter.tournamentId = tournamentId
        if (isQuickMatch !== undefined) filter.isQuickMatch = isQuickMatch
        return this.matchModel.find(filter).exec()
    }

    async findOne(id: string): Promise<MatchDocument> {
        const match = await this.matchModel.findById(id).exec()
        if (!match) throw new NotFoundException()
        return match
    }

    async getState(id: string): Promise<MatchState> {
        const match = await this.findOne(id)

        const tournament = match.tournamentId
            ? await this.tournamentModel.findById(match.tournamentId).exec()
            : null

        const rules: MatchRules = match.isQuickMatch ? {
            startingScore: match.ruleStartingScore ?? 501,
            doubleIn: match.ruleDoubleIn ?? false,
            doubleOut: match.ruleDoubleOut ?? true,
            legsToWin: match.ruleLegsToWin ?? 2,
            setsToWin: match.ruleSetsToWin ?? 0,
        } : {
            startingScore: tournament?.rules.startingScore ?? 501,
            doubleIn: tournament?.rules.doubleIn ?? false,
            doubleOut: tournament?.rules.doubleOut ?? true,
            legsToWin: match.leagueRound !== null
                ? (tournament?.rules.groupLegsToWin ?? 2)
                : (tournament?.rules.knockoutLegsToWin ?? 2),
            setsToWin: 0,
        }

        const events = await this.matchEventsService.findAllForMatch(id)
        const eventObjs = events.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
        return rebuildMatchState({ ...match.toObject(), _id: id }, eventObjs, rules)
    }

    create(data: Partial<MatchDocument>): Promise<MatchDocument> {
        return new this.matchModel(data).save()
    }

    async createQuickMatch(data: {
        players: string[]
        startingScore: number
        doubleIn: boolean
        doubleOut: boolean
        legsToWin: number
        setsToWin: number
    }): Promise<MatchDocument> {
        const match = await new this.matchModel({
            tournamentId: null,
            isQuickMatch: true,
            status: MatchStatus.Active,
            players: data.players,
            legsWon: data.players.map(() => 0),
            setsWon: data.players.map(() => 0),
            startedAt: new Date().toISOString(),
            startingPlayerIndex: 0,
            ruleStartingScore: data.startingScore,
            ruleDoubleIn: data.doubleIn,
            ruleDoubleOut: data.doubleOut,
            ruleLegsToWin: data.legsToWin,
            ruleSetsToWin: data.setsToWin,
        }).save()

        await this.matchEventsService.append(match._id.toString(), 1, MatchEventType.MatchStarted, 'system')
        this.eventEmitter.emit('match.started', { matchId: match._id.toString(), tournamentId: null })

        return match
    }

    async start(id: string, startingPlayerIndex: 0 | 1 = 0): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Pending) {
            throw new BadRequestException('Match is not pending')
        }

        match.status = MatchStatus.Active
        match.startedAt = new Date().toISOString()
        match.startingPlayerIndex = startingPlayerIndex
        await match.save()

        await this.matchEventsService.append(id, 1, MatchEventType.MatchStarted, 'system')
        this.eventEmitter.emit('match.started', { matchId: id, tournamentId: match.tournamentId })

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
        setsToWin: number = 0,
    ): Promise<MatchDocument> {
        const match = await this.findOne(id)
        if (match.status !== MatchStatus.Active) {
            throw new BadRequestException('Match is not active')
        }

        const events = await this.matchEventsService.findAllForMatch(id)
        const rules: MatchRules = { startingScore, doubleIn, doubleOut, legsToWin, setsToWin }
        const matchObj = { ...match.toObject(), _id: id }
        const eventObjs = events.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
        const state = rebuildMatchState(matchObj, eventObjs, rules)

        const darts = notations.map(n => {
            const score = parseNotation(n)
            return { notation: n.toUpperCase(), score }
        })

        const currentPlayerIndex = state.currentLeg.currentPlayerIndex
        const turn = computeTurn(
            match.players[currentPlayerIndex],
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
            const legWinner = match.players.indexOf(turn.playerId)
            match.legsWon[legWinner]++
            match.markModified('legsWon')

            await this.matchEventsService.append(id, state.currentLeg.legNumber,
                MatchEventType.LegEnded, 'system', { winnerId: turn.playerId })

            // Rebuild after LegEnded to get correct setsWon/legsWonInSet
            const postLegEvents = await this.matchEventsService.findAllForMatch(id)
            const postLegEventObjs = postLegEvents.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
            const postLegState = rebuildMatchState({ ...match.toObject(), _id: id }, postLegEventObjs, rules)

            // Update setsWon on the match document
            match.setsWon = postLegState.setsWon as unknown as number[]
            match.markModified('setsWon')

            const matchComplete = (rules.setsToWin ?? 0) > 0
                ? postLegState.setsWon[legWinner] >= rules.setsToWin!
                : postLegState.legsWon[legWinner] >= rules.legsToWin

            if (matchComplete) {
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

            if (match.status === MatchStatus.Completed && match.leagueRound !== null && match.tournamentId) {
                await this.updateStandings(match.tournamentId)
            }
        }

        // Rebuild and broadcast fresh state after every confirmed throw
        const freshEvents = await this.matchEventsService.findAllForMatch(id)
        const freshEventObjs = freshEvents.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
        const freshState = rebuildMatchState({ ...match.toObject(), _id: id }, freshEventObjs, rules)
        this.eventEmitter.emit('match.state.updated', { matchId: id, state: freshState })

        return match
    }

    async undo(id: string, rules: MatchRules): Promise<{ undoneNotations: string[] }> {
        const match = await this.findOne(id)
        const deleted = await this.matchEventsService.deleteLastThrow(id)
        if (!deleted) throw new BadRequestException('Nothing to undo')

        const turnData = deleted.data as TurnData | null
        const undoneNotations = turnData?.darts?.map(d => d.notation) ?? []

        const freshEvents = await this.matchEventsService.findAllForMatch(id)
        const freshEventObjs = freshEvents.map(e => ({ ...e.toObject(), _id: e._id.toString() }))
        const freshState = rebuildMatchState({ ...match.toObject(), _id: id }, freshEventObjs, rules)
        this.eventEmitter.emit('match.state.updated', { matchId: id, state: freshState })

        return { undoneNotations }
    }

    async reset(id: string): Promise<MatchDocument> {
        const match = await this.findOne(id)
        const wasLeagueMatch = match.leagueRound !== null
        const tournamentId = match.tournamentId
        await this.matchEventsService.deleteAllForMatch(id)
        match.status = MatchStatus.Pending
        match.legsWon = match.players.map(() => 0) as unknown as number[]
        match.markModified('legsWon')
        match.setsWon = match.players.map(() => 0) as unknown as number[]
        match.markModified('setsWon')
        match.winnerId = null
        match.startedAt = null
        match.currentLegNumber = 1
        await match.save()
        this.eventEmitter.emit('match.reset', { matchId: id, tournamentId })
        if (wasLeagueMatch && tournamentId) await this.updateStandings(tournamentId)
        return match
    }

    async deleteQuickMatch(id: string): Promise<void> {
        const match = await this.findOne(id)
        if (!match.isQuickMatch) throw new BadRequestException('Only quick matches can be deleted')
        await this.matchEventsService.deleteAllForMatch(id)
        await this.matchModel.findByIdAndDelete(id).exec()
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

    private async updateStandings(tournamentId: string): Promise<void> {
        const tournament = await this.tournamentModel.findById(tournamentId).exec()
        if (!tournament) return

        const completedMatches = await this.matchModel.find({
            tournamentId,
            leagueRound: { $ne: null },
            status: MatchStatus.Completed,
        }).exec()

        const acc = new Map<string, {
            played: number; won: number; lost: number; points: number
            legsWon: number; legsLost: number
            turnScoreTotal: number; dartsThrown: number
        }>()

        for (const pid of tournament.players) {
            acc.set(pid, { played: 0, won: 0, lost: 0, points: 0, legsWon: 0, legsLost: 0, turnScoreTotal: 0, dartsThrown: 0 })
        }

        for (const match of completedMatches) {
            const [p0, p1] = match.players
            const s0 = acc.get(p0)
            const s1 = acc.get(p1)
            if (!s0 || !s1) continue

            s0.played++; s1.played++
            s0.legsWon += match.legsWon[0]; s0.legsLost += match.legsWon[1]
            s1.legsWon += match.legsWon[1]; s1.legsLost += match.legsWon[0]

            if (match.winnerId === p0) {
                s0.won++; s0.points += 2; s1.lost++
            } else {
                s1.won++; s1.points += 2; s0.lost++
            }

            const events = await this.matchEventsService.findAllForMatch(match._id.toString())
            for (const event of events) {
                if (
                    event.type !== MatchEventType.Throw &&
                    event.type !== MatchEventType.Checkout &&
                    event.type !== MatchEventType.Bust
                ) continue
                const td = event.data as TurnData | null
                if (!td?.darts) continue
                const s = acc.get(td.playerId)
                if (!s) continue
                s.turnScoreTotal += td.turnScore
                s.dartsThrown += td.darts.length
            }
        }

        const standings: LeagueStanding[] = tournament.players.map(pid => {
            const s = acc.get(pid)!
            return {
                playerId: pid,
                played: s.played,
                won: s.won,
                lost: s.lost,
                points: s.points,
                legsWon: s.legsWon,
                legsLost: s.legsLost,
                legDifference: s.legsWon - s.legsLost,
                average: s.dartsThrown > 0
                    ? Math.round((s.turnScoreTotal / s.dartsThrown) * 3 * 10) / 10
                    : 0,
            }
        })

        standings.sort((a, b) =>
            b.points - a.points ||
            b.legDifference - a.legDifference ||
            b.legsWon - a.legsWon
        )

        tournament.standings = standings as any
        tournament.markModified('standings')
        await tournament.save()

        this.eventEmitter.emit('tournament.standings.updated', { tournamentId, standings })
    }
}
