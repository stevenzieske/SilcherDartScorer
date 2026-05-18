import { TournamentStatus, TournamentPhase } from './enums';
export interface TournamentRules {
    startingScore: 301 | 501 | 701;
    doubleIn: boolean;
    doubleOut: boolean;
    groupLegsToWin: number;
    knockoutLegsToWin: number;
    boardCount: number;
    knockoutSize: 4 | 8;
}
export interface LeagueStanding {
    playerId: string;
    played: number;
    won: number;
    lost: number;
    points: number;
    legsWon: number;
    legsLost: number;
    legDifference: number;
    average: number;
}
export interface ScheduledMatch {
    matchOrder: number;
    matchId: string;
}
export interface LeagueRound {
    roundNumber: number;
    matches: ScheduledMatch[];
}
export interface BracketSlot {
    slotIndex: number;
    matchId: string | null;
    player1: string | 'BYE' | 'TBD';
    player2: string | 'BYE' | 'TBD';
    winnerId: string | null;
    loserId: string | null;
    isBye: boolean;
    playsFor: number | null;
}
export interface BracketRound {
    roundNumber: number;
    roundName: string;
    bracketSide: 'winners' | 'consolation';
    slots: BracketSlot[];
}
export interface Tournament {
    _id: string;
    name: string;
    status: TournamentStatus;
    phase: TournamentPhase;
    rules: TournamentRules;
    players: string[];
    leagueRounds: LeagueRound[];
    standings: LeagueStanding[];
    knockoutRounds: BracketRound[];
    placements: Record<string, number>;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}
