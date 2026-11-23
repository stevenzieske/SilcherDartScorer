import { test, expect, Page } from '@playwright/test'

// ── API mocks ─────────────────────────────────────────────────────────────────

async function mockApis(page: Page) {
    await page.route('**/api/players', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
            { _id: 'p1', name: 'Alice', nickname: 'Ace', avatarColor: '#6366f1' },
            { _id: 'p2', name: 'Bob', nickname: null, avatarColor: '#10b981' },
        ]),
    }))

    await page.route('**/api/tournaments', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
    }))

    await page.route('**/api/matches**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
    }))

    await page.route('**/api/stats/player/p1', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            player: { _id: 'p1', name: 'Alice', nickname: 'Ace', avatarColor: '#6366f1' },
            stats: {
                matchesPlayed: 10, matchesWon: 7, legsWon: 25,
                dartsThrown: 480, turnScoreTotal: 42000,
                checkoutAttempts: 60, checkoutHits: 18,
                oneEighties: 3, hundredPlus: 45, hundredFortyPlus: 12,
                highestCheckout: 121, bestLegDarts: 15,
                average: 56.2, checkoutRate: 30.0,
            },
            tournamentHistory: [
                {
                    tournamentId: 't1', tournamentName: 'Spring Cup', status: 'completed',
                    placement: 1, matchesPlayed: 5, matchesWon: 4, legsWon: 12,
                    average: 58.1, highestCheckout: 121, date: '2026-05-01', isQuickMatch: false,
                },
                {
                    tournamentId: 'm1', tournamentName: 'Quick Match', status: 'completed',
                    placement: null, matchesPlayed: 1, matchesWon: 1, legsWon: 2,
                    average: 52.5, highestCheckout: 80, date: '2026-05-10', isQuickMatch: true,
                },
            ],
        }),
    }))

    // Block WebSocket upgrades
    await page.route('**/socket.io/**', route => route.abort())
}

// ── Overflow helper ───────────────────────────────────────────────────────────

async function getOverflowingElements(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const overflowing: string[] = []
        document.querySelectorAll('*').forEach(el => {
            const { scrollWidth, clientWidth } = el
            if (el === document.documentElement || el === document.body) return
            if (clientWidth === 0) return
            // Allow 2px tolerance for subpixel rounding
            if (scrollWidth > clientWidth + 2) {
                const id = el.id ? `#${el.id}` : ''
                const cls = Array.from(el.classList).slice(0, 2).join('.')
                overflowing.push(`${el.tagName.toLowerCase()}${id}${cls ? '.' + cls : ''} (scrollW=${scrollWidth} clientW=${clientWidth})`)
            }
        })
        return overflowing
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Landing page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApis(page)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
    })

    test('renders title and all nav buttons', async ({ page }) => {
        await expect(page.getByText('Silcher Dart Scorer')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Spectator' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Judge' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Stats' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Quick Match' })).toBeVisible()
    })

    test('shows version number', async ({ page }) => {
        const version = page.locator('text=/^v\\d+\\.\\d+\\.\\d+$/')
        await expect(version).toBeVisible()
    })

    test('no horizontal overflow', async ({ page }) => {
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing elements: ${overflowing.join(', ')}`).toHaveLength(0)
    })

    test('theme toggle is visible', async ({ page }) => {
        const toggle = page.locator('button[title*="mode"]')
        await expect(toggle).toBeVisible()
    })
})

test.describe('Stats — player list', () => {
    test.beforeEach(async ({ page }) => {
        await mockApis(page)
        await page.goto('/stats')
        await page.waitForLoadState('networkidle')
    })

    test('renders player cards', async ({ page }) => {
        await expect(page.getByText('Alice')).toBeVisible()
        await expect(page.getByText('Bob')).toBeVisible()
    })

    test('no horizontal overflow', async ({ page }) => {
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing: ${overflowing.join(', ')}`).toHaveLength(0)
    })
})

test.describe('Stats — player detail', () => {
    test.beforeEach(async ({ page }) => {
        await mockApis(page)
        await page.goto('/stats/p1')
        await page.waitForLoadState('networkidle')
    })

    test('renders stat cards', async ({ page }) => {
        await expect(page.getByText('3-dart avg')).toBeVisible()
        await expect(page.getByText('180s')).toBeVisible()
        await expect(page.getByText('CO Rate')).toBeVisible()
        await expect(page.getByText('100+ turns')).toBeVisible()
        await expect(page.getByText('140+ turns')).toBeVisible()
    })

    test('renders tournament history entry', async ({ page }) => {
        await expect(page.getByText('Spring Cup')).toBeVisible()
        await expect(page.getByText('1st')).toBeVisible()
    })

    test('renders quick match entry with Quick badge', async ({ page }) => {
        await expect(page.getByText('Quick Match')).toBeVisible()
        const badge = page.locator('span', { hasText: 'Quick' }).first()
        await expect(badge).toBeVisible()
    })

    test('no horizontal overflow', async ({ page }) => {
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing: ${overflowing.join(', ')}`).toHaveLength(0)
    })
})

test.describe('Quick Match setup', () => {
    test.beforeEach(async ({ page }) => {
        await mockApis(page)
        await page.goto('/quick-match')
        await page.waitForLoadState('networkidle')
    })

    test('renders player list', async ({ page }) => {
        await expect(page.getByText('Alice')).toBeVisible()
        await expect(page.getByText('Bob')).toBeVisible()
    })

    test('no horizontal overflow', async ({ page }) => {
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing: ${overflowing.join(', ')}`).toHaveLength(0)
    })
})

test.describe('Spectator — tournament list', () => {
    test.beforeEach(async ({ page }) => {
        await mockApis(page)
        await page.goto('/spectator')
        await page.waitForLoadState('networkidle')
    })

    test('renders without crash', async ({ page }) => {
        await expect(page.locator('body')).toBeVisible()
    })

    test('no horizontal overflow', async ({ page }) => {
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing: ${overflowing.join(', ')}`).toHaveLength(0)
    })
})

test.describe('Responsive layout — 320px viewport', () => {
    test.use({ viewport: { width: 320, height: 568 } })

    test('landing page fits in 320px wide viewport without overflow', async ({ page }) => {
        await mockApis(page)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText('Silcher Dart Scorer')).toBeVisible()
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing at 320px: ${overflowing.join(', ')}`).toHaveLength(0)
    })

    test('stats player list fits in 320px wide viewport without overflow', async ({ page }) => {
        await mockApis(page)
        await page.goto('/stats')
        await page.waitForLoadState('networkidle')
        const overflowing = await getOverflowingElements(page)
        expect(overflowing, `Overflowing at 320px: ${overflowing.join(', ')}`).toHaveLength(0)
    })
})
