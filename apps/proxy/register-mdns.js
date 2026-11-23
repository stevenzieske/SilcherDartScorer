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

// Kill any leftover dns-sd registrations for this service from previous runs.
// These linger when the process is killed without cleanup (e.g. SIGKILL, crash).
const cleanup = spawn('pkill', ['-f', 'dns-sd.*Dart Scorer'], { stdio: 'ignore' })
cleanup.on('close', () => startRegistration())

function startRegistration() {
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
        keepAlive()
    })

    // dns-sd exited on its own (e.g. name conflict). Log and stay alive so
    // docker compose down is NOT triggered until the user presses Ctrl+C.
    child.on('close', (code, signal) => {
        if (signal) return // killed by our own stop() — normal shutdown
        if (code !== 0) {
            console.warn(`\n  ⚠  ${fqdn} is already claimed by another device — using IP instead.`)
            console.warn(`     Try a different name:  MDNS_HOST=silcher pnpm start\n`)
            console.log(`  ✓  App is running. Press Ctrl+C to stop.`)
            console.log(`     http://localhost${portSuffix}`)
            const lanIp2 = getLanIp()
            if (lanIp2) console.log(`     http://${lanIp2}${portSuffix}\n`)
        }
        keepAlive()
    })

    let _keepAliveTimer
    function keepAlive() {
        _keepAliveTimer = setInterval(() => {}, 60_000)
    }

    const stop = () => {
        clearInterval(_keepAliveTimer)
        child.kill()
        process.exit(0)
    }
    process.on('SIGINT',  stop)
    process.on('SIGTERM', stop)
}
