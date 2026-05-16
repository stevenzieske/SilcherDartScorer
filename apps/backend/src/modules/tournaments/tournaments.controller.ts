import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CreateTournamentDto } from '@dart/shared'
import { AdminGuard } from '../auth/admin.guard'
import { TournamentsService } from './tournaments.service'

@Controller('tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Get()
    findAll() {
        return this.tournamentsService.findAll()
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tournamentsService.findOne(id)
    }

    @Post()
    @UseGuards(AdminGuard)
    create(@Body() body: CreateTournamentDto) {
        return this.tournamentsService.create(body)
    }

    @Post(':id/start')
    @UseGuards(AdminGuard)
    start(@Param('id') id: string) {
        return this.tournamentsService.start(id)
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    delete(@Param('id') id: string) {
        return this.tournamentsService.delete(id)
    }
}
