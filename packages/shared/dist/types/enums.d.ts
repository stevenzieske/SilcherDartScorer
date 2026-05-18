export declare enum TournamentStatus {
    Draft = "draft",
    Active = "active",
    Completed = "completed"
}
export declare enum MatchStatus {
    Pending = "pending",
    Active = "active",
    Paused = "paused",
    Completed = "completed"
}
export declare enum MatchEventType {
    MatchStarted = "match_started",
    LegStarted = "leg_started",
    Throw = "throw",
    Bust = "bust",
    Checkout = "checkout",
    LegEnded = "leg_ended",
    MatchEnded = "match_ended",
    Paused = "paused",
    Resumed = "resumed",
    Undo = "undo"
}
export declare enum UserRole {
    Admin = "admin",
    Spectator = "spectator",
    Judge = "judge",
    BigScreen = "bigscreen"
}
export declare enum TournamentPhase {
    League = "league",
    Knockout = "knockout"
}
