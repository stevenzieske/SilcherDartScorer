#!/usr/bin/env node
'use strict'

const http = require('http')
const { createProxyServer } = require('http-proxy')
const { spawn } = require('child_process')
const os = require('os')

const PORT     = parseInt(process.env.PORT     ?? '80',                    10)
const UPSTREAM = process.env.UPSTREAM          ?? 'http://127.0.0.1:5173'
const HOSTNAME = process.env.MDNS_HOST         ?? 'darts'  // advertised as <HOSTNAME>.local

// ── LAN IP ────────────────────────────────────────────────────────────────────

function getLanIp() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of (ifaces ?? [])) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address
        }
    }
    return null
}

// ── Proxy server ──────────────────────────────────────────────────────────────

const proxy = createProxyServer({ target: UPSTREAM, ws: true })

proxy.on('error', (_err, _req, res) => {
    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
        // HTTP request — return a readable error page
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Dart scorer not started.\n\nRun:  pnpm dev\n')
    } else if (res && typeof res.end === 'function') {
        // WebSocket socket — just close it cleanly
        res.end()
    }
})

const server = http.createServer((req, res) => proxy.web(req, res))

// Forward WebSocket upgrades (Socket.IO / Vite HMR)
server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy())
    proxy.ws(req, socket, head)
})

server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use — kill it with:  lsof -ti:${PORT} | xargs kill`)
    } else if (err.code === 'EACCES') {
        console.error(`Port ${PORT} requires elevated privileges — try:  sudo pnpm start:local`)
    } else {
        console.error('Server error:', err.message)
    }
    process.exit(1)
})

// Kill any leftover dns-sd registrations from previous runs before starting.
const _cleanup = spawn('pkill', ['-f', 'dns-sd.*Dart Scorer'], { stdio: 'ignore' })
_cleanup.on('close', () => {
    server.listen(PORT, '0.0.0.0', () => {
        const lanIp = getLanIp()
        const fqdn  = `${HOSTNAME}.local`

        console.log(`\nProxy  :${PORT}  →  ${UPSTREAM}`)

        if (!lanIp) {
            console.warn('No LAN IP found — mDNS registration skipped.')
            console.log(`Local access only: http://localhost:${PORT}\n`)
            return
        }

        registerMdns({ ip: lanIp, port: PORT, fqdn })

        const portSuffix = PORT === 80 ? '' : `:${PORT}`
        console.log(`\n  ✓  http://${fqdn}${portSuffix}`)
        console.log(`     accessible from every device on this network\n`)
    })
})

// ── mDNS registration (macOS dns-sd) ─────────────────────────────────────────

function registerMdns({ ip, port, fqdn }) {
    // dns-sd -P registers both:
    //   • an _http._tcp service  (shows up in Bonjour browsers)
    //   • an A record for <fqdn> pointing to <ip>  (makes the hostname resolvable)
    // The process must stay alive for the registration to persist.
    const child = spawn(
        'dns-sd',
        ['-P', 'Dart Scorer', '_http._tcp', 'local', String(port), fqdn, ip, ''],
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
    })

    child.on('exit', code => {
        if (code !== null && code !== 0) {
            console.error(`dns-sd exited (code ${code}) — hostname may be unresolvable`)
        }
    })

    const stop = () => {
        child.kill()
        server.close()
        process.exit(0)
    }
    process.on('SIGINT',  stop)
    process.on('SIGTERM', stop)
}
