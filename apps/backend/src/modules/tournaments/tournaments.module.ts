import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TournamentModel, TournamentSchema } from './tournament.schema'
import { TournamentsService } from './tournaments.service'
import { TournamentsController } from './tournaments.controller'
import { AuthModule } from '../auth/auth.module'
import { MatchesModule } from '../matches/matches.module'

@Module({
    imports: [
        MongooseModule.forFeature([{ name: TournamentModel.name, schema: TournamentSchema }]),
        AuthModule,
        forwardRef(() => MatchesModule),
    ],
    providers: [TournamentsService],
    controllers: [TournamentsController],
    exports: [TournamentsService],
})
export class TournamentsModule {}
