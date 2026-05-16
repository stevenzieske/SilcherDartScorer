export enum TournamentStatus {
    Draft = 'draft',
    Active = 'active',
    Completed = 'completed',
}

export enum MatchStatus {
    Pending = 'pending',
    Active = 'active',
    Paused = 'paused',
    Completed = 'completed',
}

export enum MatchEventType {
    MatchStarted = 'match_started',
    LegStarted = 'leg_started',
    Throw = 'throw',
    Bust = 'bust',
    Checkout = 'checkout',
    LegEnded = 'leg_ended',
    MatchEnded = 'match_ended',
    Paused = 'paused',
    Resumed = 'resumed',
    Undo = 'undo',
}


export enum UserRole {
    Admin     = 'admin',
    Spectator = 'spectator',
    Judge     = 'judge',
    BigScreen = 'bigscreen',
}

export enum TournamentPhase {
    League   = 'league',
    Knockout = 'knockout',
}
