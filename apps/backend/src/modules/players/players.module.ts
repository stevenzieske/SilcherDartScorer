import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PlayerModel, PlayerSchema } from "./player.schema";
import { AuthModule } from "../auth/auth.module";
import { PlayersService } from "./players.service";
import { PlayersController } from "./players.controller";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: PlayerModel.name, schema: PlayerSchema }]),
        AuthModule,
    ],
    providers: [PlayersService],
    controllers: [PlayersController],
    exports: [PlayersService],
})
export class PlayersModule { }
