"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = void 0;
exports.EVENTS = {
    // Client → Server
    SUBSCRIBE_TOURNAMENT: 'subscribe:tournament',
    SUBSCRIBE_MATCH: 'subscribe:match',
    SUBSCRIBE_BOARD: 'subscribe:board',
    SUBSCRIBE_JUDGES: 'subscribe:judges',
    DART_THROWN: 'dart:thrown',
    JUDGE_CLAIM_MATCH: 'judge:claim',
    JUDGE_RELEASE_MATCH: 'judge:release',
    // Server → Client — match
    MATCH_STATE: 'match:state',
    MATCH_EVENT: 'match:event',
    MATCH_STARTED: 'match:started',
    MATCH_ENDED: 'match:ended',
    MATCH_RESET: 'match:reset',
    BOARD_UPDATED: 'board:updated',
    DART_IN_PROGRESS: 'dart:in_progress',
    // Server → Client — judges
    JUDGE_CLAIMS_UPDATED: 'judge:claims_updated',
    // Server → Client — tournament
    LEAGUE_STANDINGS: 'league:standings',
    LEAGUE_ROUND_COMPLETE: 'league:round_complete',
    PHASE_CHANGED: 'phase:changed',
    KNOCKOUT_BRACKET: 'knockout:bracket',
};
