import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'mobile',
            use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } },
        },
        {
            name: 'desktop',
            use: { viewport: { width: 1280, height: 800 } },
        },
    ],
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
    },
})
