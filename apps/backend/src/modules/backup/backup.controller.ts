import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { BackupService, BackupPayload } from './backup.service'
import { AdminGuard } from '../auth/admin.guard'

@Controller('admin/backup')
@UseGuards(AdminGuard)
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Get('export')
    export() {
        return this.backupService.exportAll()
    }

    @Post('import')
    import(@Body() body: BackupPayload) {
        return this.backupService.importAll(body)
    }

    @Delete('nuke')
    nuke() {
        return this.backupService.nukeAll()
    }
}
