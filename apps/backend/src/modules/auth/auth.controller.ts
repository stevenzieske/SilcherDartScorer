import { Controller, Get, UseGuards } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

@Controller('auth')
export class AuthController {
    @Get('verify')
    @UseGuards(AdminGuard)
    verify() {
        return { ok: true }
    }
}
