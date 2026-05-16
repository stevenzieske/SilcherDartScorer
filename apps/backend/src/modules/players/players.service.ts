import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PlayerDocument, PlayerModel } from "./player.schema";
import { Model } from "mongoose";
import { CreatePlayerDto } from "@dart/shared";

@Injectable()
export class PlayersService {
    constructor(
        @InjectModel(PlayerModel.name)
        private readonly playerModel: Model<PlayerDocument>
    ) { }

    findAll(): Promise<PlayerDocument[]> {
        return this.playerModel.find().exec()
    }

    async findOne(id: string): Promise<PlayerDocument> {
        const player = await this.playerModel.findById(id).exec()
        if (!player) throw new NotFoundException()
        return player
    }

    create(dto: CreatePlayerDto): Promise<PlayerDocument> {
        return new this.playerModel(dto).save()
    }

    async update(id: string, dto: Partial<CreatePlayerDto>): Promise<PlayerDocument> {
        const player = await this.playerModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec()
        if (!player) throw new NotFoundException()
        return player
    }

    async remove(id: string): Promise<void> {
        const result = await this.playerModel.findByIdAndDelete(id).exec()
        if (!result) throw new NotFoundException()
    }
}
