import { ParseError } from '@dart/shared'
import { parseNotation } from './dart-parser'

describe('parseNotation', () => {

    describe('singles', () => {
        it('parses 1', () => expect(parseNotation('1')).toBe(1))
        it('parses 20', () => expect(parseNotation('20')).toBe(20))
        it('parses 10', () => expect(parseNotation('10')).toBe(10))
    })

    describe('doubles', () => {
        it('parses D1', () => expect(parseNotation('D1')).toBe(2))
        it('parses D20', () => expect(parseNotation('D20')).toBe(40))
        it('parses D16', () => expect(parseNotation('D16')).toBe(32))
    })

    describe('triples', () => {
        it('parses T1', () => expect(parseNotation('T1')).toBe(3))
        it('parses T20', () => expect(parseNotation('T20')).toBe(60))
        it('parses T19', () => expect(parseNotation('T19')).toBe(57))
    })

    describe('bull and miss', () => {
        it('parses BULL as 50', () => expect(parseNotation('BULL')).toBe(50))
        it('parses MISS as 0', () => expect(parseNotation('MISS')).toBe(0))
        it('parses 25 as 25', () => expect(parseNotation('25')).toBe(25))
    })

    describe('case insensitivity', () => {
        it('parses t20', () => expect(parseNotation('t20')).toBe(60))
        it('parses d16', () => expect(parseNotation('d16')).toBe(32))
        it('parses bull', () => expect(parseNotation('bull')).toBe(50))
        it('parses miss', () => expect(parseNotation('miss')).toBe(0))
    })

    describe('whitespace trimming', () => {
        it('trims leading and trailing spaces', () => expect(parseNotation(' T20 ')).toBe(60))
    })

    describe('invalid notations — throws ParseError', () => {
        it('throws on empty string', () => expect(() => parseNotation('')).toThrow(ParseError))
        it('throws on 0', () => expect(() => parseNotation('0')).toThrow(ParseError))
        it('throws on 21', () => expect(() => parseNotation('21')).toThrow(ParseError))
        it('throws on D21', () => expect(() => parseNotation('D21')).toThrow(ParseError))
        it('throws on T0', () => expect(() => parseNotation('T0')).toThrow(ParseError))
        it('throws on TBULL', () => expect(() => parseNotation('TBULL')).toThrow(ParseError))
        it('throws on DBULL', () => expect(() => parseNotation('DBULL')).toThrow(ParseError))
        it('throws on TMISS', () => expect(() => parseNotation('TMISS')).toThrow(ParseError))
        it('throws on DMISS', () => expect(() => parseNotation('DMISS')).toThrow(ParseError))
        it('throws on random string', () => expect(() => parseNotation('XYZ')).toThrow(ParseError))
        it('throws on negative number', () => expect(() => parseNotation('-5')).toThrow(ParseError))
        it('throws on D0', () => expect(() => parseNotation('D0')).toThrow(ParseError))
    })

    describe('ParseError contains the invalid notation', () => {
        it('error message includes the notation', () => {
            try {
                parseNotation('XYZ')
            } catch (e) {
                expect(e).toBeInstanceOf(ParseError)
                expect((e as ParseError).notation).toBe('XYZ')
            }
        })
    })
})
