import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchModel, MatchSchema } from "./match.schema";
import { TournamentModel, TournamentSchema } from "../tournaments/tournament.schema";
import { AuthModule } from "../auth/auth.module";
import { MatchesService } from "./matches.service";
import { MatchesController } from "./matches.controller";
import { MatchEventsModule } from "../match-events/match-events.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: MatchModel.name, schema: MatchSchema },
            { name: TournamentModel.name, schema: TournamentSchema },
        ]),
        AuthModule,
        MatchEventsModule,
    ],
    providers: [MatchesService],
    controllers: [MatchesController],
    exports: [MatchesService],
})

export class MatchesModule { }
