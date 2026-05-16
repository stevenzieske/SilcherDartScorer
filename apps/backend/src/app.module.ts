import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import envConfig from './config/env.config';
import { HealthController } from './health.controller';
import { PlayersModule } from './modules/players/players.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { MatchesModule } from './modules/matches/matches.module';
import { MatchEventsModule } from './modules/match-events/match-events.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [envConfig],
        }),

        MongooseModule.forRootAsync({
            inject: [ConfigService],

            useFactory: (config: ConfigService) => ({
                uri: config.get<string>('mongoUri'),
            }),
        }),

        PlayersModule,
        TournamentsModule,
        MatchesModule,
        MatchEventsModule,
        GatewayModule
    ],

    controllers: [HealthController],
})
export class AppModule { }
