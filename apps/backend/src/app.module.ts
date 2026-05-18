import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import envConfig from './config/env.config';
import { HealthController } from './health.controller';
import { PlayersModule } from './modules/players/players.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { MatchesModule } from './modules/matches/matches.module';
import { MatchEventsModule } from './modules/match-events/match-events.module';
import { GatewayModule } from './gateway/gateway.module';
import { StatsModule } from './modules/stats/stats.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
        EventEmitterModule.forRoot(),

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
        GatewayModule,
        StatsModule,
        AuthModule,
    ],

    controllers: [HealthController],
})
export class AppModule { }
