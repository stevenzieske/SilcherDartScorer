export interface CareerStats {
    matchesPlayed: number;
    matchesWon: number;
    legsPlayed: number;
    legsWon: number;
    dartsThrown: number;
    turnScoreTotal: number;
    turnsPlayed: number;
    checkoutAttempts: number;
    checkoutHits: number;
    oneEighties: number;
    highestCheckout: number;
    highestTurn: number;
}
export interface Player {
    _id: string;
    name: string;
    nickname?: string;
    avatarColor: string;
    careerStats: CareerStats;
    createdAt: string;
}
