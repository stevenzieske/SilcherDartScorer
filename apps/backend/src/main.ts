import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    app.use(express.json({ limit: '30mb' }));
    app.enableCors();

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
