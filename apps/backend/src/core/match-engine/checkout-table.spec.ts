import { parseNotation } from './dart-parser'
import { getCheckout } from './checkout-table'

describe('getCheckout', () => {

    describe('every defined route sums to its score (verified via dart-parser)', () => {
        for (let score = 2; score <= 170; score++) {
            const route = getCheckout(score)
            if (route === null) continue
            it(`score ${score}: [${route.join(', ')}]`, () => {
                const total = route.reduce((sum, dart) => sum + parseNotation(dart), 0)
                expect(total).toBe(score)
            })
        }
    })

    describe('every defined route ends on a double', () => {
        for (let score = 2; score <= 170; score++) {
            const route = getCheckout(score)
            if (route === null) continue
            it(`score ${score} ends on double or BULL`, () => {
                const last = route[route.length - 1]
                expect(last === 'BULL' || /^D\d+$/i.test(last)).toBe(true)
            })
        }
    })

    describe('every defined route uses at most 3 darts', () => {
        for (let score = 2; score <= 170; score++) {
            const route = getCheckout(score)
            if (route === null) continue
            it(`score ${score} has 1–3 darts`, () => {
                expect(route.length).toBeGreaterThanOrEqual(1)
                expect(route.length).toBeLessThanOrEqual(3)
            })
        }
    })

    describe('impossible and out-of-range scores return null', () => {
        const impossible = [0, 1, 159, 162, 163, 165, 166, 168, 169, 171, 501, -1]
        for (const score of impossible) {
            it(`returns null for ${score}`, () => expect(getCheckout(score)).toBeNull())
        }
    })

    describe('well-known spot checks', () => {
        it('170 → T20 T20 BULL', () => expect(getCheckout(170)).toEqual(['T20', 'T20', 'BULL']))
        it('160 → T20 T20 D20', () => expect(getCheckout(160)).toEqual(['T20', 'T20', 'D20']))
        it('110 → T20 BULL (2 darts)', () => expect(getCheckout(110)).toEqual(['T20', 'BULL']))
        it('100 → T20 D20 (2 darts)', () => expect(getCheckout(100)).toEqual(['T20', 'D20']))
        it('50  → BULL (1 dart)', () => expect(getCheckout(50)).toEqual(['BULL']))
        it('40  → D20 (1 dart)', () => expect(getCheckout(40)).toEqual(['D20']))
        it('32  → D16 (1 dart)', () => expect(getCheckout(32)).toEqual(['D16']))
        it('2   → D1 (1 dart)', () => expect(getCheckout(2)).toEqual(['D1']))
    })
})
