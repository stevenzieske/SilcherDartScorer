import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AdminGuard } from './admin.guard'

function makeContext(authHeader: string): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({
                headers: { authorization: authHeader },
            }),
        }),
    } as unknown as ExecutionContext
}

describe('AdminGuard', () => {
    let guard: AdminGuard

    beforeEach(() => {
        const config = { get: jest.fn().mockReturnValue('1234') } as unknown as ConfigService
        guard = new AdminGuard(config)
    })

    it('returns true for correct PIN', () => {
        expect(guard.canActivate(makeContext('Bearer 1234'))).toBe(true)
    })

    it('throws for empty authorization header', () => {
        expect(() => guard.canActivate(makeContext(''))).toThrow(UnauthorizedException)
    })

    it('throws for wrong PIN', () => {
        expect(() => guard.canActivate(makeContext('Bearer wrong'))).toThrow(UnauthorizedException)
    })

    it('throws when Bearer prefix is missing', () => {
        expect(() => guard.canActivate(makeContext('1234'))).toThrow(UnauthorizedException)
    })

    it('throws for missing Authorization header entirely', () => {
        const ctx = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
            }),
        } as unknown as ExecutionContext
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
    })
})
