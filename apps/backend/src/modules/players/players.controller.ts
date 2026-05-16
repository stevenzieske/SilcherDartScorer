import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PlayersService } from "./players.service";
import { AdminGuard } from "../auth/admin.guard";
import { CreatePlayerDto } from "@dart/shared";

@Controller('players')
export class PlayersController {
    constructor(private readonly playersService: PlayersService) { }

    @Get()
    findAll() {
        return this.playersService.findAll()
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.playersService.findOne(id)
    }

    @Post()
    @UseGuards(AdminGuard)
    create(@Body() body: CreatePlayerDto) {
        return this.playersService.create(body)
    }

    @Patch(':id')
    @UseGuards(AdminGuard)
    update(@Param('id') id: string, @Body() body: Partial<CreatePlayerDto>) {
        return this.playersService.update(id, body)
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    remove(@Param('id') id: string) {
        return this.playersService.remove(id)
    }
}
