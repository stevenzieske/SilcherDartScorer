import type { DartThrow, LegState, Match, MatchEvent, MatchState, TurnData } from "@dart/shared";
import { MatchEventType, MatchRules } from "@dart/shared";

export function initialLegState(
    legNumber: number,
    startingPlayerIndex: number,
    startingScore: number,
    playerCount: number = 2
): LegState {
    return {
        legNumber,
        remaining: Array(playerCount).fill(startingScore),
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
    if (darts.length === 0) {
        throw new Error('computeTurn requires at least one dart')
    }

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

export function applyTurnToLeg(leg: LegState, turn: TurnData, playerCount: number = 2): LegState {
    const newRemaining = [...leg.remaining]
    newRemaining[leg.currentPlayerIndex] = turn.remainingAfter

    return {
        ...leg,
        turns: [...leg.turns, turn],
        remaining: newRemaining,
        currentPlayerIndex: turn.isCheckout
            ? leg.currentPlayerIndex
            : (leg.currentPlayerIndex + 1) % playerCount,
    }
}

export function rebuildMatchState(match: Match, events: MatchEvent[], rules: MatchRules): MatchState {
    const sorted = [...events].sort((a, b) => a.sequence - b.sequence)

    const playerCount = match.players.length
    const startingPlayerIndex = match.startingPlayerIndex ?? 0

    let legsWon: number[] = Array(playerCount).fill(0)
    let legsWonInSet: number[] = Array(playerCount).fill(0)
    let setsWon: number[] = Array(playerCount).fill(0)
    let currentLeg = initialLegState(1, startingPlayerIndex, rules.startingScore, playerCount)
    let previousLegs: LegState[] = []
    let status: MatchState['status'] = 'active'
    let winnerId: string | null = null

    const setsMode = (rules.setsToWin ?? 0) > 0

    for (const event of sorted) {
        switch (event.type) {
            case MatchEventType.Throw:
            case MatchEventType.Bust:
            case MatchEventType.Checkout:
                currentLeg = applyTurnToLeg(currentLeg, event.data as TurnData, playerCount)
                break

            case MatchEventType.LegEnded: {
                const { winnerId: legWinnerId } = event.data as { winnerId: string }
                const winnerIndex = match.players.indexOf(legWinnerId)
                legsWon = [...legsWon]
                legsWon[winnerIndex]++
                legsWonInSet = [...legsWonInSet]
                legsWonInSet[winnerIndex]++

                if (setsMode && legsWonInSet[winnerIndex] >= rules.legsToWin) {
                    setsWon = [...setsWon]
                    setsWon[winnerIndex]++
                    legsWonInSet = Array(playerCount).fill(0)
                }

                status = 'leg_complete'
                break
            }

            case MatchEventType.LegStarted: {
                previousLegs = [...previousLegs, currentLeg]
                const nextStartingPlayer = (currentLeg.startingPlayerIndex + 1) % playerCount
                currentLeg = initialLegState(currentLeg.legNumber + 1, nextStartingPlayer, rules.startingScore, playerCount)
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
        previousLegs,
        legsWon,
        legsWonInSet,
        setsWon,
        winnerId,
        rules,
    }
}
