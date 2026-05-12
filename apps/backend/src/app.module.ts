import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import envConfig from './config/env.config';
import { HealthController } from './health.controller';

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
    ],

    controllers: [HealthController],
})
export class AppModule { }
