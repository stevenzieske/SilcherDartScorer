import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchEventsModule } from "../modules/match-events/match-events.module";
import { MatchModel, MatchSchema } from "../modules/matches/match.schema";
import { TournamentGateway } from "./tournament.gateway";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MatchModel.name, schema: MatchSchema }]),
        MatchEventsModule,
    ],
    providers: [TournamentGateway],
    exports: [TournamentGateway],
})
export class GatewayModule { }
