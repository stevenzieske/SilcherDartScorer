import { Controller, Get, Param } from '@nestjs/common'
import { StatsService } from './stats.service'

@Controller('stats')
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('player/:playerId')
    getPlayerStats(@Param('playerId') playerId: string) {
        return this.statsService.getPlayerStats(playerId)
    }

    @Get('tournament/:tournamentId')
    getTournamentStats(@Param('tournamentId') tournamentId: string) {
        return this.statsService.getTournamentStats(tournamentId)
    }
}
