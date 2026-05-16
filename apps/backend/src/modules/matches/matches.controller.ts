import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { AdminGuard } from "../auth/admin.guard";

@Controller('matches')
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) { }

    @Get()
    findAll(@Query('status') status?: string) {
        return this.matchesService.findAll(status)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.matchesService.findOne(id)
    }

    @Post(':id/start')
    @UseGuards(AdminGuard)
    start(@Param('id') id: string) {
        return this.matchesService.start(id)
    }

    @Post(':id/throw')
    throw(@Param('id') id: string, @Body() body: {
        judgeId: string,
        darts: string[],
        startingScore: number
        legsToWin: number
        doubleIn: boolean
        doubleOut: boolean
    }) {
        return this.matchesService.submitThrow(
            id,
            body.judgeId,
            body.darts,
            body.startingScore,
            body.legsToWin,
            body.doubleIn,
            body.doubleOut,
        )
    }

    @Post(':id/undo')
    undo(@Param('id') id: string) {
        return this.matchesService.undo(id)
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
