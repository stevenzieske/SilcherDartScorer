"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentPhase = exports.UserRole = exports.MatchEventType = exports.MatchStatus = exports.TournamentStatus = void 0;
var TournamentStatus;
(function (TournamentStatus) {
    TournamentStatus["Draft"] = "draft";
    TournamentStatus["Active"] = "active";
    TournamentStatus["Completed"] = "completed";
})(TournamentStatus || (exports.TournamentStatus = TournamentStatus = {}));
var MatchStatus;
(function (MatchStatus) {
    MatchStatus["Pending"] = "pending";
    MatchStatus["Active"] = "active";
    MatchStatus["Paused"] = "paused";
    MatchStatus["Completed"] = "completed";
})(MatchStatus || (exports.MatchStatus = MatchStatus = {}));
var MatchEventType;
(function (MatchEventType) {
    MatchEventType["MatchStarted"] = "match_started";
    MatchEventType["LegStarted"] = "leg_started";
    MatchEventType["Throw"] = "throw";
    MatchEventType["Bust"] = "bust";
    MatchEventType["Checkout"] = "checkout";
    MatchEventType["LegEnded"] = "leg_ended";
    MatchEventType["MatchEnded"] = "match_ended";
    MatchEventType["Paused"] = "paused";
    MatchEventType["Resumed"] = "resumed";
    MatchEventType["Undo"] = "undo";
})(MatchEventType || (exports.MatchEventType = MatchEventType = {}));
var UserRole;
(function (UserRole) {
    UserRole["Admin"] = "admin";
    UserRole["Spectator"] = "spectator";
    UserRole["Judge"] = "judge";
    UserRole["BigScreen"] = "bigscreen";
})(UserRole || (exports.UserRole = UserRole = {}));
var TournamentPhase;
(function (TournamentPhase) {
    TournamentPhase["League"] = "league";
    TournamentPhase["Knockout"] = "knockout";
})(TournamentPhase || (exports.TournamentPhase = TournamentPhase = {}));
