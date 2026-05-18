import type { DartThrow, LegState, Match, MatchEvent, MatchState, TurnData } from "@dart/shared";
import { MatchEventType, MatchRules } from "@dart/shared";

export function initialLegState(
    legNumber: number,
    startingPlayerIndex: 0 | 1,
    startingScore: number
): LegState {
    return {
        legNumber,
        remaining: [startingScore, startingScore],
        currentPlayerIndex: startingPlayerIndex,
        startingPlayerIndex: startingPlayerIndex,
        turns: []
    }
}

export function isDoubleOrBull(
    notation: string
): boolean {
    if (notation === 'BULL') return true

    if (notation.slice(0, 1) === 'D') return true

    return false
}

export function computeTurn(playerId: string, leg: LegState, darts: DartThrow[], rules: MatchRules): TurnData {

    const remainingBefore = leg.remaining[leg.currentPlayerIndex];

    let turnScore: number

    if (rules.doubleIn && remainingBefore === rules.startingScore) {
        const doubleIndex = darts.findIndex((dart) => isDoubleOrBull(dart.notation))
        turnScore = doubleIndex === -1
            ? 0
            : darts.slice(doubleIndex).reduce((sum, d) => sum + d.score, 0)

    } else {
        turnScore = darts.reduce((sum, d) => sum + d.score, 0)
    }

    const lastDart = darts[darts.length - 1]
    let remainingAfter = remainingBefore - turnScore

    const isBust = remainingAfter < 0
        || (rules.doubleOut && remainingAfter === 1)
        || (rules.doubleOut && remainingAfter === 0 && !isDoubleOrBull(lastDart.notation))

    if (isBust) {
        remainingAfter = remainingBefore
        turnScore = 0
    }

    const isCheckout = !isBust && remainingAfter === 0

    return {
        playerId,
        legNumber: leg.legNumber,
        darts,
        turnScore,
        remainingBefore,
        remainingAfter,
        isBust,
        isCheckout
    }
}

export function applyTurnToLeg(leg: LegState, turn: TurnData): LegState {
    const newRemaining: [number, number] = [leg.remaining[0], leg.remaining[1]]
    newRemaining[leg.currentPlayerIndex] = turn.remainingAfter

    return {
        ...leg,
        turns: [...leg.turns, turn],
        remaining: newRemaining,
        currentPlayerIndex: turn.isCheckout
            ? leg.currentPlayerIndex
            : leg.currentPlayerIndex === 0 ? 1 : 0,
    }
}

export function rebuildMatchState(match: Match, events: MatchEvent[], rules: MatchRules): MatchState {
    const sorted = [...events].sort((a, b) => a.sequence - b.sequence)

    const startingPlayerIndex = ((match.startingPlayerIndex ?? 0) as 0 | 1)

    let legsWon: [number, number] = [0, 0]
    let currentLeg = initialLegState(1, startingPlayerIndex, rules.startingScore)
    let status: MatchState['status'] = 'active'
    let winnerId: string | null = null

    for (const event of sorted) {
        switch (event.type) {
            case MatchEventType.Throw:
            case MatchEventType.Bust:
            case MatchEventType.Checkout:
                currentLeg = applyTurnToLeg(currentLeg, event.data as TurnData)
                break

            case MatchEventType.LegEnded: {
                const { winnerId: legWinnerId } = event.data as { winnerId: string }
                const winnerIndex = match.players.indexOf(legWinnerId) as 0 | 1
                legsWon = [legsWon[0], legsWon[1]]
                legsWon[winnerIndex]++
                status = 'leg_complete'
                break
            }

            case MatchEventType.LegStarted: {
                const nextStartingPlayer = (currentLeg.startingPlayerIndex === 0 ? 1 : 0) as 0 | 1
                currentLeg = initialLegState(currentLeg.legNumber + 1, nextStartingPlayer, rules.startingScore)
                status = 'active'
                break
            }

            case MatchEventType.MatchEnded:
                winnerId = (event.data as { winnerId: string }).winnerId
                status = 'match_complete'
                break

            case MatchEventType.Resumed:
                status = 'active'
                break
        }
    }

    return {
        matchId: match._id,
        status,
        players: match.players,
        currentLeg,
        legsWon,
        winnerId,
        rules,
    }
}
