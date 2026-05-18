import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@dart/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
        }
    },
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: BACKEND,
                changeOrigin: true,
                rewrite: p => p.replace(/^\/api/, '')
            },
            '/socket.io': {
                target: BACKEND,
                ws: true,
                changeOrigin: true
            }
        }
    }
})
