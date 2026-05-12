import { TournamentStatus } from './enums'

export interface TournamentRules {
    startingScore: 301 | 501 | 701
    doubleIn: boolean
    doubleOut: boolean
    legsToWin: number
    boardCount: number
}

export interface BracketSlot {
    slotIndex: number
    matchId: string | null
    player1: string | 'BYE' | 'TBD'
    player2: string | 'BYE' | 'TBD'
    winnerId: string | null
    isBye: boolean
}

export interface BracketRound {
    roundNumber: number
    roundName: string
    slots: BracketSlot[]
}

export interface Tournament {
    _id: string
    name: string
    status: TournamentStatus
    rules: TournamentRules
    players: string[]
    rounds: BracketRound[]
    createdAt: string
    startedAt?: string
    completedAt?: string
}
