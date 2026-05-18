import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PlayerModel, PlayerSchema } from '../players/player.schema'
import { TournamentModel, TournamentSchema } from '../tournaments/tournament.schema'
import { MatchModel, MatchSchema } from '../matches/match.schema'
import { MatchEventModel, MatchEventSchema } from '../match-events/match-event.schema'
import { AuthModule } from '../auth/auth.module'
import { BackupService } from './backup.service'
import { BackupController } from './backup.controller'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlayerModel.name, schema: PlayerSchema },
            { name: TournamentModel.name, schema: TournamentSchema },
            { name: MatchModel.name, schema: MatchSchema },
            { name: MatchEventModel.name, schema: MatchEventSchema },
        ]),
        AuthModule,
    ],
    providers: [BackupService],
    controllers: [BackupController],
})
export class BackupModule { }
