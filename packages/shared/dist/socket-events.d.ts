import { MatchState } from './types/match-engine.types';
import { DartInProgressData, MatchEvent } from './types/match.types';
import { BracketRound, LeagueStanding } from './types/tournament.types';
export declare const EVENTS: {
    readonly SUBSCRIBE_TOURNAMENT: "subscribe:tournament";
    readonly SUBSCRIBE_MATCH: "subscribe:match";
    readonly SUBSCRIBE_BOARD: "subscribe:board";
    readonly SUBSCRIBE_JUDGES: "subscribe:judges";
    readonly DART_THROWN: "dart:thrown";
    readonly JUDGE_CLAIM_MATCH: "judge:claim";
    readonly JUDGE_RELEASE_MATCH: "judge:release";
    readonly MATCH_STATE: "match:state";
    readonly MATCH_EVENT: "match:event";
    readonly MATCH_STARTED: "match:started";
    readonly MATCH_ENDED: "match:ended";
    readonly MATCH_RESET: "match:reset";
    readonly BOARD_UPDATED: "board:updated";
    readonly DART_IN_PROGRESS: "dart:in_progress";
    readonly JUDGE_CLAIMS_UPDATED: "judge:claims_updated";
    readonly LEAGUE_STANDINGS: "league:standings";
    readonly LEAGUE_ROUND_COMPLETE: "league:round_complete";
    readonly PHASE_CHANGED: "phase:changed";
    readonly KNOCKOUT_BRACKET: "knockout:bracket";
};
export interface ServerToClientEvents {
    [EVENTS.MATCH_STATE]: (state: MatchState) => void;
    [EVENTS.MATCH_EVENT]: (event: MatchEvent) => void;
    [EVENTS.MATCH_STARTED]: (data: {
        matchId: string;
        tournamentId: string;
    }) => void;
    [EVENTS.MATCH_ENDED]: (data: {
        matchId: string;
        winnerId: string;
    }) => void;
    [EVENTS.MATCH_RESET]: (data: {
        matchId: string;
    }) => void;
    [EVENTS.BOARD_UPDATED]: (data: {
        board: number;
        matchId: string;
        state: MatchState;
    }) => void;
    [EVENTS.DART_IN_PROGRESS]: (data: DartInProgressData) => void;
    [EVENTS.JUDGE_CLAIMS_UPDATED]: (claims: Record<string, string>) => void;
    [EVENTS.LEAGUE_STANDINGS]: (standings: LeagueStanding[]) => void;
    [EVENTS.LEAGUE_ROUND_COMPLETE]: (data: {
        roundNumber: number;
        standings: LeagueStanding[];
    }) => void;
    [EVENTS.PHASE_CHANGED]: (data: {
        phase: 'knockout';
        knockoutRounds: BracketRound[];
    }) => void;
    [EVENTS.KNOCKOUT_BRACKET]: (rounds: BracketRound[]) => void;
}
export interface ClientToServerEvents {
    [EVENTS.SUBSCRIBE_TOURNAMENT]: (tournamentId: string) => void;
    [EVENTS.SUBSCRIBE_MATCH]: (matchId: string) => void;
    [EVENTS.SUBSCRIBE_BOARD]: (board: number) => void;
    [EVENTS.SUBSCRIBE_JUDGES]: () => void;
    [EVENTS.DART_THROWN]: (data: {
        matchId: string;
        notation: string;
    }) => void;
    [EVENTS.JUDGE_CLAIM_MATCH]: (data: {
        matchId: string;
        judgeId: string;
    }) => void;
    [EVENTS.JUDGE_RELEASE_MATCH]: (data: {
        matchId: string;
    }) => void;
}
