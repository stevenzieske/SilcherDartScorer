"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTournamentSchema = void 0;
const zod_1 = require("zod");
exports.CreateTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    playerIds: zod_1.z.array(zod_1.z.string()).min(4),
    rules: zod_1.z.object({
        startingScore: zod_1.z.union([zod_1.z.literal(301), zod_1.z.literal(501), zod_1.z.literal(701)]),
        doubleIn: zod_1.z.boolean().default(false),
        doubleOut: zod_1.z.boolean().default(true),
        groupLegsToWin: zod_1.z.number().int().min(1).default(2),
        knockoutLegsToWin: zod_1.z.number().int().min(1).default(3),
        boardCount: zod_1.z.number().int().min(1).max(4).default(2),
        knockoutSize: zod_1.z.union([zod_1.z.literal(4), zod_1.z.literal(8)]).default(4),
    }),
});
