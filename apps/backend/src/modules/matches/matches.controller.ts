import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { AdminGuard } from "../auth/admin.guard";

@Controller('matches')
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) { }

    @Get()
    findAll(
        @Query('status') status?: string,
        @Query('tournamentId') tournamentId?: string,
        @Query('isQuickMatch') isQuickMatch?: string,
    ) {
        const isQuickMatchBool = isQuickMatch !== undefined
            ? isQuickMatch === 'true'
            : undefined
        return this.matchesService.findAll(status, tournamentId, isQuickMatchBool)
    }

    // NOTE: must be defined BEFORE :id or it will conflict
    @Get('quick/active')
    findActiveQuickMatches() {
        return this.matchesService.findAll('active', undefined, true)
    }

    @Delete('quick/:id')
    deleteQuickMatch(@Param('id') id: string) {
        return this.matchesService.deleteQuickMatch(id)
    }

    @Post('quick')
    createQuickMatch(@Body() body: {
        players: string[]
        startingScore: number
        doubleIn: boolean
        doubleOut: boolean
        legsToWin: number
        setsToWin: number
    }) {
        return this.matchesService.createQuickMatch(body)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.matchesService.findOne(id)
    }

    @Get(':id/state')
    getState(@Param('id') id: string) {
        return this.matchesService.getState(id)
    }

    @Post(':id/start')
    start(@Param('id') id: string, @Body() body: { startingPlayerIndex?: 0 | 1 }) {
        return this.matchesService.start(id, body?.startingPlayerIndex ?? 0)
    }

    @Post(':id/throw')
    throw(@Param('id') id: string, @Body() body: {
        judgeId: string,
        darts: string[],
        startingScore: number
        legsToWin: number
        doubleIn: boolean
        doubleOut: boolean
        setsToWin?: number
    }) {
        return this.matchesService.submitThrow(
            id,
            body.judgeId,
            body.darts,
            body.startingScore,
            body.legsToWin,
            body.doubleIn,
            body.doubleOut,
            body.setsToWin ?? 0,
        )
    }

    @Post(':id/undo')
    undo(@Param('id') id: string, @Body() body: {
        startingScore: number
        legsToWin: number
        doubleIn: boolean
        doubleOut: boolean
        setsToWin?: number
    }) {
        return this.matchesService.undo(id, {
            startingScore: body.startingScore,
            legsToWin: body.legsToWin,
            doubleIn: body.doubleIn,
            doubleOut: body.doubleOut,
            setsToWin: body.setsToWin ?? 0,
        })
    }

    @Post(':id/reset')
    reset(@Param('id') id: string) {
        return this.matchesService.reset(id)
    }

    @Patch(':id/pause')
    @UseGuards(AdminGuard)
    pause(@Param('id') id: string) {
        return this.matchesService.pause(id)
    }

    @Patch(':id/resume')
    @UseGuards(AdminGuard)
    resume(@Param('id') id: string) {
        return this.matchesService.resume(id)
    }
}
