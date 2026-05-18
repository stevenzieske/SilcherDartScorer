import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { StatsService } from './stats.service'
import { StatsController } from './stats.controller'
import { PlayerModel, PlayerSchema } from '../players/player.schema'
import { MatchModel, MatchSchema } from '../matches/match.schema'
import { MatchEventModel, MatchEventSchema } from '../match-events/match-event.schema'
import { TournamentModel, TournamentSchema } from '../tournaments/tournament.schema'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlayerModel.name, schema: PlayerSchema },
            { name: MatchModel.name, schema: MatchSchema },
            { name: MatchEventModel.name, schema: MatchEventSchema },
            { name: TournamentModel.name, schema: TournamentSchema },
        ]),
    ],
    controllers: [StatsController],
    providers: [StatsService],
})
export class StatsModule { }
