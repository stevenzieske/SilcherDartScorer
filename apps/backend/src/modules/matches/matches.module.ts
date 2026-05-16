import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchModel, MatchSchema } from "./match.schema";
import { AuthModule } from "../auth/auth.module";
import { MatchesService } from "./matches.service";
import { MatchesController } from "./matches.controller";
import { MatchEventsModule } from "../match-events/match-events.module";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MatchModel.name, schema: MatchSchema }]),
        AuthModule,
        MatchEventsModule,
    ],
    providers: [MatchesService],
    controllers: [MatchesController],
    exports: [MatchesService],
})

export class MatchesModule { }
