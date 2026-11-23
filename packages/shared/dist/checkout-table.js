"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckout = getCheckout;
exports.buildCheckoutDisplay = buildCheckoutDisplay;
// Optimal double-out checkout routes for scores 2–170.
// Scores not present (0, 1, 159, 162, 163, 165, 166, 168, 169) have no valid checkout.
const CHECKOUTS = {
    2: ['D1'],
    3: ['1', 'D1'],
    4: ['D2'],
    5: ['1', 'D2'],
    6: ['D3'],
    7: ['3', 'D2'],
    8: ['D4'],
    9: ['1', 'D4'],
    10: ['D5'],
    11: ['3', 'D4'],
    12: ['D6'],
    13: ['5', 'D4'],
    14: ['D7'],
    15: ['7', 'D4'],
    16: ['D8'],
    17: ['9', 'D4'],
    18: ['D9'],
    19: ['3', 'D8'],
    20: ['D10'],
    21: ['5', 'D8'],
    22: ['D11'],
    23: ['7', 'D8'],
    24: ['D12'],
    25: ['9', 'D8'],
    26: ['D13'],
    27: ['7', 'D10'],
    28: ['D14'],
    29: ['9', 'D10'],
    30: ['D15'],
    31: ['7', 'D12'],
    32: ['D16'],
    33: ['9', 'D12'],
    34: ['D17'],
    35: ['3', 'D16'],
    36: ['D18'],
    37: ['5', 'D16'],
    38: ['D19'],
    39: ['7', 'D16'],
    40: ['D20'],
    41: ['9', 'D16'],
    42: ['10', 'D16'],
    43: ['3', 'D20'],
    44: ['4', 'D20'],
    45: ['5', 'D20'],
    46: ['6', 'D20'],
    47: ['7', 'D20'],
    48: ['8', 'D20'],
    49: ['9', 'D20'],
    50: ['BULL'],
    51: ['11', 'D20'],
    52: ['12', 'D20'],
    53: ['13', 'D20'],
    54: ['14', 'D20'],
    55: ['15', 'D20'],
    56: ['16', 'D20'],
    57: ['17', 'D20'],
    58: ['18', 'D20'],
    59: ['19', 'D20'],
    60: ['20', 'D20'],
    61: ['T15', 'D8'],
    62: ['T10', 'D16'],
    63: ['T13', 'D12'],
    64: ['T16', 'D8'],
    65: ['T11', 'D16'],
    66: ['T10', 'D18'],
    67: ['T17', 'D8'],
    68: ['T20', 'D4'],
    69: ['T19', 'D6'],
    70: ['T10', 'D20'],
    71: ['T13', 'D16'],
    72: ['T16', 'D12'],
    73: ['T19', 'D8'],
    74: ['T14', 'D16'],
    75: ['T17', 'D12'],
    76: ['T20', 'D8'],
    77: ['T19', 'D10'],
    78: ['T18', 'D12'],
    79: ['T19', 'D11'],
    80: ['T20', 'D10'],
    81: ['T19', 'D12'],
    82: ['T14', 'D20'],
    83: ['T17', 'D16'],
    84: ['T20', 'D12'],
    85: ['T15', 'D20'],
    86: ['T18', 'D16'],
    87: ['T17', 'D18'],
    88: ['T20', 'D14'],
    89: ['T19', 'D16'],
    90: ['T20', 'D15'],
    91: ['T17', 'D20'],
    92: ['T20', 'D16'],
    93: ['T19', 'D18'],
    94: ['T18', 'D20'],
    95: ['T19', 'D19'],
    96: ['T20', 'D18'],
    97: ['T19', 'D20'],
    98: ['T20', 'D19'],
    99: ['T19', '10', 'D16'],
    100: ['T20', 'D20'],
    101: ['T17', 'BULL'],
    102: ['T20', '2', 'D20'],
    103: ['T20', '3', 'D20'],
    104: ['T20', '4', 'D20'],
    105: ['T20', '5', 'D20'],
    106: ['T20', '6', 'D20'],
    107: ['T20', '7', 'D20'],
    108: ['T20', '8', 'D20'],
    109: ['T20', '9', 'D20'],
    110: ['T20', 'BULL'],
    111: ['T20', '11', 'D20'],
    112: ['T20', '12', 'D20'],
    113: ['T20', '13', 'D20'],
    114: ['T20', '14', 'D20'],
    115: ['T20', '15', 'D20'],
    116: ['T20', '16', 'D20'],
    117: ['T20', '17', 'D20'],
    118: ['T20', '18', 'D20'],
    119: ['T20', '19', 'D20'],
    120: ['T20', '20', 'D20'],
    121: ['T20', 'T19', 'D2'],
    122: ['T20', 'T20', 'D1'],
    123: ['T20', 'T19', 'D3'],
    124: ['T20', 'T20', 'D2'],
    125: ['T20', 'T19', 'D4'],
    126: ['T20', 'T20', 'D3'],
    127: ['T20', 'T19', 'D5'],
    128: ['T20', 'T20', 'D4'],
    129: ['T20', 'T19', 'D6'],
    130: ['T20', 'T20', 'D5'],
    131: ['T20', 'T19', 'D7'],
    132: ['T20', 'T20', 'D6'],
    133: ['T20', 'T19', 'D8'],
    134: ['T20', 'T20', 'D7'],
    135: ['T20', 'T19', 'D9'],
    136: ['T20', 'T20', 'D8'],
    137: ['T20', 'T19', 'D10'],
    138: ['T20', 'T20', 'D9'],
    139: ['T20', 'T19', 'D11'],
    140: ['T20', 'T20', 'D10'],
    141: ['T20', 'T19', 'D12'],
    142: ['T20', 'T20', 'D11'],
    143: ['T20', 'T19', 'D13'],
    144: ['T20', 'T20', 'D12'],
    145: ['T20', 'T19', 'D14'],
    146: ['T20', 'T20', 'D13'],
    147: ['T20', 'T19', 'D15'],
    148: ['T20', 'T20', 'D14'],
    149: ['T20', 'T19', 'D16'],
    150: ['T20', 'T20', 'D15'],
    151: ['T20', 'T19', 'D17'],
    152: ['T20', 'T20', 'D16'],
    153: ['T20', 'T19', 'D18'],
    154: ['T20', 'T20', 'D17'],
    155: ['T20', 'T19', 'D19'],
    156: ['T20', 'T20', 'D18'],
    157: ['T20', 'T19', 'D20'],
    158: ['T20', 'T20', 'D19'],
    // 159: impossible
    160: ['T20', 'T20', 'D20'],
    161: ['T20', 'T17', 'BULL'],
    // 162: impossible
    // 163: impossible
    164: ['T20', 'T18', 'BULL'],
    // 165: impossible
    // 166: impossible
    167: ['T20', 'T19', 'BULL'],
    // 168: impossible
    // 169: impossible
    170: ['T20', 'T20', 'BULL'],
};
function getCheckout(remaining) {
    return CHECKOUTS[remaining] ?? null;
}
/**
 * Returns the full checkout route with each dart marked done or pending.
 * When thrown darts match the checkout prefix the full route stays visible
 * throughout the turn.  If the player deviates the route recalculates.
 * Pass doubleOut=false to suppress hints for straight-out matches.
 */
function buildCheckoutDisplay(turnStartRemaining, thrownNotations, currentRemaining, doubleOut = true) {
    if (!doubleOut)
        return null;
    if (currentRemaining < 0)
        return null;
    const route = getCheckout(turnStartRemaining);
    if (route) {
        let matchCount = 0;
        for (let i = 0; i < thrownNotations.length && i < route.length; i++) {
            if (thrownNotations[i] === route[i])
                matchCount++;
            else
                break;
        }
        if (matchCount === thrownNotations.length) {
            return route.map((d, i) => ({ notation: d, done: i < matchCount }));
        }
    }
    const currentRoute = getCheckout(currentRemaining);
    if (!currentRoute)
        return null;
    return currentRoute.map(d => ({ notation: d, done: false }));
}
