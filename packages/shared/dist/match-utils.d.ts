export declare function scoreFromNotation(n: string): number;
export declare function isDoubleNotation(n: string): boolean;
/**
 * Returns true when the current turn should be auto-submitted.
 *
 * A turn ends when:
 * - 3 darts have been thrown, OR
 * - a dart causes a checkout (remaining reaches exactly 0 on a valid double), OR
 * - a dart causes a bust (remaining goes negative or lands on 1 / non-double 0 with doubleOut).
 *
 * When doubleIn is active AND startRemaining equals startingScore (player hasn't opened yet),
 * darts before the first double don't affect the score, so only the darts from the
 * first double onward are simulated. If no double is hit, the turn can only end at 3 darts.
 */
export declare function isTurnTerminal(darts: string[], startRemaining: number, doubleOut: boolean, doubleIn: boolean, startingScore: number): boolean;
