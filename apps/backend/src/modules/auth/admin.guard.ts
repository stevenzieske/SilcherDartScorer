import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from 'express'

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>()
        const header = request.headers['authorization'] ?? ''
        const pin = header.startsWith('Bearer ') ? header.slice(7) : ''

        if (!pin || pin !== this.config.get<string>('adminPin')) {
            throw new UnauthorizedException()
        }

        return true
    }
}
