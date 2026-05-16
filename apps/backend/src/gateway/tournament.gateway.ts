import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Model } from "mongoose";
import { Server, Socket } from 'socket.io'
import { MatchEventsService } from "../modules/match-events/match-events.service";
import { MatchDocument, MatchModel } from "../modules/matches/match.schema";
import type { DartInProgressData, DartThrow } from "@dart/shared";
import { EVENTS } from "@dart/shared";
import { parseNotation } from "../core/match-engine/dart-parser";

const dartBuffer = new Map<string, DartThrow[]>()

@Injectable()
@WebSocketGateway({ cors: true })
export class TournamentGateway implements OnGatewayInit {
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

    @SubscribeMessage(EVENTS.SUBSCRIBE_TOURNAMENT)
    subscribeTournament(
        @MessageBody() tournamentId: string,
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`tournament:${tournamentId}`)
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_MATCH)
    subscribeMatch(
        @MessageBody() matchId: string,
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`match:${matchId}`)
    }

    @SubscribeMessage(EVENTS.SUBSCRIBE_BOARD)
    subscribeBoard(
        @MessageBody() board: number,
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`board:${board}`)
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

        const existing = dartBuffer.get(matchId) ?? []
        const dartsThrown = [...existing, dart]
        dartBuffer.set(matchId, dartsThrown)

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

    clearDartBuffer(matchId: string) {
        dartBuffer.delete(matchId)
    }
}
