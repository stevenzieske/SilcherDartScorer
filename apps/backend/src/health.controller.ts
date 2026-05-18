import { Controller, Get } from '@nestjs/common';
import * as os from 'os';

@Controller()
export class HealthController {
    @Get('health')
    getHealth() {
        return { status: 'ok' };
    }

    @Get('network-ip')
    getNetworkIP() {
        if (process.env.HOST_IP) return { ip: process.env.HOST_IP }
        const nets = os.networkInterfaces()
        for (const list of Object.values(nets)) {
            for (const net of list ?? []) {
                if (net.family === 'IPv4' && !net.internal) {
                    return { ip: net.address }
                }
            }
        }
        return { ip: null }
    }
}
