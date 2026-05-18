import { z } from 'zod';
export declare const CreateTournamentSchema: z.ZodObject<{
    name: z.ZodString;
    playerIds: z.ZodArray<z.ZodString, "many">;
    rules: z.ZodObject<{
        startingScore: z.ZodUnion<[z.ZodLiteral<301>, z.ZodLiteral<501>, z.ZodLiteral<701>]>;
        doubleIn: z.ZodDefault<z.ZodBoolean>;
        doubleOut: z.ZodDefault<z.ZodBoolean>;
        groupLegsToWin: z.ZodDefault<z.ZodNumber>;
        knockoutLegsToWin: z.ZodDefault<z.ZodNumber>;
        boardCount: z.ZodDefault<z.ZodNumber>;
        knockoutSize: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<4>, z.ZodLiteral<8>]>>;
    }, "strip", z.ZodTypeAny, {
        startingScore: 301 | 501 | 701;
        doubleIn: boolean;
        doubleOut: boolean;
        groupLegsToWin: number;
        knockoutLegsToWin: number;
        boardCount: number;
        knockoutSize: 4 | 8;
    }, {
        startingScore: 301 | 501 | 701;
        doubleIn?: boolean | undefined;
        doubleOut?: boolean | undefined;
        groupLegsToWin?: number | undefined;
        knockoutLegsToWin?: number | undefined;
        boardCount?: number | undefined;
        knockoutSize?: 4 | 8 | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    playerIds: string[];
    rules: {
        startingScore: 301 | 501 | 701;
        doubleIn: boolean;
        doubleOut: boolean;
        groupLegsToWin: number;
        knockoutLegsToWin: number;
        boardCount: number;
        knockoutSize: 4 | 8;
    };
}, {
    name: string;
    playerIds: string[];
    rules: {
        startingScore: 301 | 501 | 701;
        doubleIn?: boolean | undefined;
        doubleOut?: boolean | undefined;
        groupLegsToWin?: number | undefined;
        knockoutLegsToWin?: number | undefined;
        boardCount?: number | undefined;
        knockoutSize?: 4 | 8 | undefined;
    };
}>;
export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>;
