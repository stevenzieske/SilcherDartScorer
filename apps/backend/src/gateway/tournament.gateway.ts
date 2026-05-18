import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Model } from "mongoose";
import { Server, Socket } from 'socket.io'
import { MatchEventsService } from "../modules/match-events/match-events.service";
import { MatchDocument, MatchModel } from "../modules/matches/match.schema";
import type { DartInProgressData, DartThrow } from "@dart/shared";
import { EVENTS } from "@dart/shared";
import { parseNotation } from "../core/match-engine/dart-parser";

const dartBuffer = new Map<string, DartInProgressData>()
const claimedMatches = new Map<string, string>()  // matchId → judgeId
const socketClaims = new Map<string, string>()     // socketId → matchId

@Injectable()
@WebSocketGateway({ cors: true })
export class TournamentGateway implements OnGatewayInit, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    constructor(
        @InjectModel(MatchModel.name)
        private readonly matchModel: Model<MatchDocument>,
        private readonly matchEventsService: MatchEventsService,
    ) { }

    afterInit(server: Server) {
        this.server = server
    }

    handleDisconnect(client: Socket) {
        const matchId = socketClaims.get(client.id)
        if (matchId) {
            claimedMatches.delete(matchId)
            socketClaims.delete(client.id)
            this.server.to('judges:lobby').emit(EVENTS.JUDGE_CLAIMS_UPDATED, Object.fromEntries(claimedMatches))
        }
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_TOURNAMENT)
    subscribeTournament(@MessageBody() tournamentId: string, @ConnectedSocket() client: Socket) {
        client.join(`tournament:${tournamentId}`)
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_MATCH)
    subscribeMatch(@MessageBody() matchId: string, @ConnectedSocket() client: Socket) {
        client.join(`match:${matchId}`)
        const buffered = dartBuffer.get(matchId)
        if (buffered) client.emit(EVENTS.DART_IN_PROGRESS, buffered)
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_BOARD)
    subscribeBoard(@MessageBody() board: number, @ConnectedSocket() client: Socket) {
        client.join(`board:${board}`)
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_JUDGES)
    subscribeJudges(@ConnectedSocket() client: Socket) {
        client.join('judges:lobby')
        client.emit(EVENTS.JUDGE_CLAIMS_UPDATED, Object.fromEntries(claimedMatches))
    }

    @SubscribeMessage(EVENTS.JUDGE_CLAIM_MATCH)
    handleJudgeClaim(
        @MessageBody() data: { matchId: string; judgeId: string },
        @ConnectedSocket() client: Socket,
    ) {
        // Release any previous claim this socket held
        const prev = socketClaims.get(client.id)
        if (prev) claimedMatches.delete(prev)

        claimedMatches.set(data.matchId, data.judgeId)
        socketClaims.set(client.id, data.matchId)
        this.server.to('judges:lobby').emit(EVENTS.JUDGE_CLAIMS_UPDATED, Object.fromEntries(claimedMatches))
    }

    @SubscribeMessage(EVENTS.JUDGE_RELEASE_MATCH)
    handleJudgeRelease(
        @MessageBody() data: { matchId: string },
        @ConnectedSocket() client: Socket,
    ) {
        claimedMatches.delete(data.matchId)
        socketClaims.delete(client.id)
        this.server.to('judges:lobby').emit(EVENTS.JUDGE_CLAIMS_UPDATED, Object.fromEntries(claimedMatches))
    }

    @SubscribeMessage(EVENTS.DART_THROWN)
    handleDartThrown(
        @MessageBody() data: { matchId: string; notation: string; playerId: string; remainingBefore: number },
        @ConnectedSocket() client: Socket,
    ) {
        const { matchId, notation, playerId, remainingBefore } = data

        let score: number
        try {
            score = parseNotation(notation)
        } catch {
            return
        }

        const dart: DartThrow = { notation: notation.toUpperCase(), score }

        const existingDarts = dartBuffer.get(matchId)?.dartsThrown ?? []
        const dartsThrown = [...existingDarts, dart]
        const runningScore = dartsThrown.reduce((sum, d) => sum + d.score, 0)

        const payload: DartInProgressData = {
            matchId,
            playerId,
            legNumber: 0,
            dartIndex: dartsThrown.length - 1,
            dart,
            dartsThrown,
            runningScore,
            runningRemaining: remainingBefore - runningScore
        }

        dartBuffer.set(matchId, payload)
        this.server.to(`match:${matchId}`).emit(EVENTS.DART_IN_PROGRESS, payload)
    }

    broadcastToMatch(matchId: string, event: string, data: unknown) {
        this.server.to(`match:${matchId}`).emit(event, data)
    }

    broadcastToTournament(tournamentId: string, event: string, data: unknown) {
        this.server.to(`tournament:${tournamentId}`).emit(event, data)
    }

    broadcastToBoard(board: number, event: string, data: unknown) {
        this.server.to(`board:${board}`).emit(event, data)
    }

    @OnEvent('match.state.updated')
    handleMatchStateUpdated({ matchId, state }: { matchId: string; state: unknown }) {
        dartBuffer.delete(matchId)
        this.server.to(`match:${matchId}`).emit(EVENTS.MATCH_STATE, state)
    }

    @OnEvent('match.started')
    handleMatchStarted({ matchId, tournamentId }: { matchId: string; tournamentId: string }) {
        const payload = { matchId, tournamentId }
        this.server.to(`tournament:${tournamentId}`).emit(EVENTS.MATCH_STARTED, payload)
        this.server.to('judges:lobby').emit(EVENTS.MATCH_STARTED, payload)
    }

    @OnEvent('match.reset')
    handleMatchReset({ matchId, tournamentId }: { matchId: string; tournamentId: string }) {
        dartBuffer.delete(matchId)
        const payload = { matchId, tournamentId }
        this.server.to(`match:${matchId}`).emit(EVENTS.MATCH_RESET, payload)
        this.server.to(`tournament:${tournamentId}`).emit(EVENTS.MATCH_RESET, payload)
        this.server.to('judges:lobby').emit(EVENTS.MATCH_RESET, payload)
    }

    @OnEvent('tournament.standings.updated')
    handleStandingsUpdated({ tournamentId, standings }: { tournamentId: string; standings: unknown[] }) {
        this.server.to(`tournament:${tournamentId}`).emit(EVENTS.LEAGUE_STANDINGS, standings)
    }

    clearDartBuffer(matchId: string) {
        dartBuffer.delete(matchId)
    }
}
