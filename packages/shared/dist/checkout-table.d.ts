export declare function getCheckout(remaining: number): string[] | null;
/**
 * Returns the full checkout route with each dart marked done or pending.
 * When thrown darts match the checkout prefix the full route stays visible
 * throughout the turn.  If the player deviates the route recalculates.
 */
export declare function buildCheckoutDisplay(turnStartRemaining: number, thrownNotations: string[], currentRemaining: number): {
    notation: string;
    done: boolean;
}[] | null;
