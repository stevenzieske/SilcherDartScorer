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

    @Post(':id/advance-knockout')
    @UseGuards(AdminGuard)
    advanceToKnockout(@Param('id') id: string, @Body() body: { knockoutLegsToWin?: number }) {
        return this.tournamentsService.advanceToKnockout(id, body.knockoutLegsToWin)
    }

    @Post(':id/complete')
    @UseGuards(AdminGuard)
    complete(@Param('id') id: string) {
        return this.tournamentsService.complete(id)
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    delete(@Param('id') id: string) {
        return this.tournamentsService.delete(id)
    }
}
