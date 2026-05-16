import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchEventModel, MatchEventSchema } from "./match-event.schema";
import { MatchEventsService } from "./match-events.service";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: MatchEventModel.name, schema: MatchEventSchema }]),
    ],
    providers: [MatchEventsService],
    exports: [MatchEventsService],
})
export class MatchEventsModule { }
