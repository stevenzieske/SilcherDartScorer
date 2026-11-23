import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')) as { version: string }
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
        alias: {
            '@dart/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
        }
    },
    server: {
        host: true,
        port: 5173,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: BACKEND,
                changeOrigin: true,
                rewrite: p => p.replace(/^\/api/, ''),
                configure: proxy => proxy.on('error', () => {})
            },
            '/socket.io': {
                target: BACKEND,
                ws: true,
                changeOrigin: true,
                configure: proxy => proxy.on('error', () => {})
            }
        }
    }
})
