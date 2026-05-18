import { MatchStatus, MatchEventType } from './enums';
export interface DartThrow {
    notation: string;
    score: number;
}
export interface TurnData {
    playerId: string;
    legNumber: number;
    darts: DartThrow[];
    turnScore: number;
    remainingBefore: number;
    remainingAfter: number;
    isBust: boolean;
    isCheckout: boolean;
}
export interface Match {
    _id: string;
    tournamentId: string | null;
    leagueRound: number | null;
    roundNumber: number | null;
    slotIndex: number | null;
    board: number | null;
    status: MatchStatus;
    players: string[];
    currentLegNumber: number;
    legsWon: number[];
    setsWon: number[];
    winnerId: string | null;
    judgeId: string | null;
    startedAt: string | null;
    endedAt: string | null;
    startingPlayerIndex: number;
    isQuickMatch: boolean;
    ruleStartingScore: number | null;
    ruleDoubleIn: boolean | null;
    ruleDoubleOut: boolean | null;
    ruleLegsToWin: number | null;
    ruleSetsToWin: number | null;
}
export interface DartInProgressData {
    matchId: string;
    playerId: string;
    legNumber: number;
    dartIndex: number;
    dart: DartThrow;
    dartsThrown: DartThrow[];
    runningScore: number;
    runningRemaining: number;
}
export interface MatchEvent {
    _id: string;
    matchId: string;
    legNumber: number;
    sequence: number;
    type: MatchEventType;
    actorId: string;
    data: TurnData | {
        winnerId: string;
    } | null;
    timestamp: string;
}
