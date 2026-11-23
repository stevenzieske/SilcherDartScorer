#!/usr/bin/env node
'use strict'

const { spawn } = require('child_process')
const os = require('os')

const PORT     = parseInt(process.env.PORT     ?? '80', 10)
const HOSTNAME = process.env.MDNS_HOST         ?? 'darts'

function getLanIp() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of (ifaces ?? [])) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address
        }
    }
    return null
}

const lanIp = getLanIp()
const fqdn  = `${HOSTNAME}.local`

if (!lanIp) {
    console.warn('No LAN IP found — mDNS registration skipped.')
    console.log(`App available at http://localhost:${PORT}`)
    process.exit(0)
}

const portSuffix = PORT === 80 ? '' : `:${PORT}`
console.log(`\n  ✓  http://${fqdn}${portSuffix}`)
console.log(`     accessible from every device on this network\n`)

const child = spawn(
    'dns-sd',
    ['-P', 'Dart Scorer', '_http._tcp', 'local', String(PORT), fqdn, lanIp, ''],
    { stdio: ['ignore', 'pipe', 'pipe'] }
)

child.stdout.on('data', d => process.stdout.write(d))
child.stderr.on('data', d => process.stderr.write(d))

child.on('error', err => {
    if (err.code === 'ENOENT') {
        console.warn('dns-sd not found — mDNS skipped (macOS only)')
    } else {
        console.error('mDNS error:', err.message)
    }
    // Keep process alive so Docker stays up — mDNS failure is non-fatal
    keepAlive()
})

// dns-sd exited on its own (e.g. name conflict). Log and stay alive so
// docker compose down is NOT triggered until the user presses Ctrl+C.
child.on('close', (code, signal) => {
    if (signal) return // killed by our own stop() — normal shutdown
    if (code !== 0) {
        console.warn(`\n  ⚠  mDNS registration failed (dns-sd exited with code ${code}).`)
        console.warn(`     Try a different hostname:  MDNS_HOST=silcher pnpm start`)
        console.warn(`     App still running at http://localhost${PORT === 80 ? '' : ':' + PORT}\n`)
    }
    keepAlive()
})

let _keepAliveTimer
function keepAlive() {
    // Hold the event loop open until SIGINT/SIGTERM
    _keepAliveTimer = setInterval(() => {}, 60_000)
}

const stop = () => {
    clearInterval(_keepAliveTimer)
    child.kill()
    process.exit(0)
}
process.on('SIGINT',  stop)
process.on('SIGTERM', stop)
