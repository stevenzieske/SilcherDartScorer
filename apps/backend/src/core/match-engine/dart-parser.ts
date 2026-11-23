import { ParseError } from "@dart/shared";

const NOTATION_REGEX = /^(T|D)?([0-9]+|BULL|MISS)$/i

export function parseNotation(notation: string): number {
    const match = notation.trim().toUpperCase().match(NOTATION_REGEX)

    if (!match) throw new ParseError(notation)

    const multiplierString = match[1]
    const valueString = match[2]

    if (valueString === 'MISS') {
        if (multiplierString) throw new ParseError(notation)
        return 0
    }

    if (valueString === 'BULL') {
        if (multiplierString) throw new ParseError(notation)
        return 50
    }

    const number = parseInt(valueString, 10)
    if (number === 25) {
        if (multiplierString) throw new ParseError(notation)
        return 25
    }
    if (number < 1 || number > 20) throw new ParseError(notation)

    const multiplier = multiplierString === 'T' ? 3 : multiplierString === 'D' ? 2 : 1

    return multiplier * number
}
